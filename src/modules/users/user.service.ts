import bcrypt from 'bcryptjs';
import { prisma, Role, RecordStatus } from '../../lib/prisma.js';
import { AppError } from '../../lib/errors.js';
import { resolveUserPermissions } from '../auth/permissions.js';
import { validatePasswordStrength } from '../auth/auth.js';
import { recordActivity } from '../audit/audit.service.js';
import { ensureImageUrl } from '../upload/upload.service.js';

export async function listUsers(query: {
  search?: string;
  role?: string;
  status?: string;
  page?: string | number;
  limit?: string | number;
}) {
  const page = Math.max(1, Number(query.page || 1));
  const limit = Math.min(100, Math.max(1, Number(query.limit || 20)));
  const skip = (page - 1) * limit;

  const where: any = {};

  if (query.search) {
    const s = query.search.trim();
    where.OR = [
      { name: { contains: s, mode: 'insensitive' } },
      { email: { contains: s, mode: 'insensitive' } },
      { phone: { contains: s, mode: 'insensitive' } },
    ];
  }

  if (query.role && query.role !== 'ALL') {
    where.OR = [
      { role: query.role as Role },
      { roleId: query.role },
    ];
  }

  if (query.status && query.status !== 'ALL') {
    where.status = query.status as RecordStatus;
  }

  const [total, users] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      skip,
      take: limit,
      include: {
        customRole: {
          select: { id: true, name: true },
        },
        _count: {
          select: { activityLogs: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    }),
  ]);

  const items = users.map((u: any) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    phone: u.phone,
    avatar: u.avatar,
    role: u.role,
    roleId: u.roleId,
    roleName: u.customRole?.name || u.role,
    status: u.status,
    activityCount: u._count.activityLogs,
    lastLoginAt: u.lastLoginAt,
    createdAt: u.createdAt,
    updatedAt: u.updatedAt,
  }));

  return {
    items,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  };
}

export async function getUserById(id: string) {
  const user = await prisma.user.findUnique({
    where: { id },
    include: {
      customRole: true,
      activityLogs: {
        take: 10,
        orderBy: { createdAt: 'desc' },
      },
    },
  });

  if (!user) {
    throw new AppError(404, 'User account not found', 'NOT_FOUND');
  }

  const permissions = resolveUserPermissions(user);

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    avatar: user.avatar,
    role: user.role,
    roleId: user.roleId,
    roleName: user.customRole?.name || user.role,
    customRole: user.customRole,
    permissions,
    status: user.status,
    lastLoginAt: user.lastLoginAt,
    activityLogs: user.activityLogs,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

export async function createUser(data: {
  name: string;
  email: string;
  password: string;
  phone?: string;
  avatar?: string;
  role?: string;
  roleId?: string;
  status?: string;
}) {
  if (!data.name || !data.email || !data.password) {
    throw new AppError(400, 'Name, email, and password are required', 'VALIDATION_ERROR');
  }

  validatePasswordStrength(data.password);

  const existing = await prisma.user.findUnique({
    where: { email: data.email.toLowerCase().trim() },
  });

  if (existing) {
    throw new AppError(400, 'A user with this email address already exists', 'DUPLICATE_EMAIL');
  }

  const passwordHash = await bcrypt.hash(data.password, 10);

  let assignedRole: Role = Role.ADMIN;
  let customRoleId: string | null = null;

  if (data.roleId) {
    const roleDef = await prisma.roleDefinition.findUnique({ where: { id: data.roleId } });
    if (roleDef) {
      customRoleId = roleDef.id;
      if (roleDef.name === 'Super Admin') assignedRole = Role.SUPER_ADMIN;
      else if (roleDef.name === 'Operations Manager') assignedRole = Role.MANAGER;
      else if (roleDef.name === 'Sales Executive') assignedRole = Role.SALES;
      else if (roleDef.name === 'Procurement Specialist') assignedRole = Role.PURCHASE;
      else if (roleDef.name === 'Accountant') assignedRole = Role.ACCOUNTANT;
      else assignedRole = Role.MANAGER;
    }
  } else if (data.role && Object.values(Role).includes(data.role as Role)) {
    assignedRole = data.role as Role;
  }

  const avatarUrl = await ensureImageUrl(data.avatar, 'stockpilot/avatars');

  const user = await prisma.user.create({
    data: {
      name: data.name.trim(),
      email: data.email.toLowerCase().trim(),
      phone: data.phone?.trim() || null,
      avatar: avatarUrl || null,
      passwordHash,
      role: assignedRole,
      roleId: customRoleId,
      status: (data.status as RecordStatus) || RecordStatus.ACTIVE,
    },
    include: { customRole: true },
  });

  await recordActivity({
    action: 'CREATE',
    module: 'SETTINGS',
    reference: `User Account: ${user.email}`,
    details: { userId: user.id, email: user.email, role: user.role, status: user.status },
  });

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    avatar: user.avatar,
    role: user.role,
    roleId: user.roleId,
    roleName: user.customRole?.name || user.role,
    status: user.status,
    createdAt: user.createdAt,
  };
}

export async function updateUser(
  id: string,
  data: {
    name?: string;
    email?: string;
    phone?: string;
    avatar?: string;
    password?: string;
    role?: string;
    roleId?: string;
    status?: string;
  }
) {
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) throw new AppError(404, 'User not found', 'NOT_FOUND');

  const updateData: any = {};

  if (data.name) updateData.name = data.name.trim();
  if (data.phone !== undefined) updateData.phone = data.phone?.trim() || null;
  if (data.avatar !== undefined) {
    const avatarUrl = await ensureImageUrl(data.avatar, 'stockpilot/avatars');
    updateData.avatar = avatarUrl || null;
  }
  if (data.status) updateData.status = data.status as RecordStatus;

  if (data.email && data.email.toLowerCase().trim() !== user.email) {
    const existing = await prisma.user.findUnique({
      where: { email: data.email.toLowerCase().trim() },
    });
    if (existing) throw new AppError(400, 'Email address is already in use by another account', 'DUPLICATE_EMAIL');
    updateData.email = data.email.toLowerCase().trim();
  }

  if (data.password && data.password.trim().length > 0) {
    validatePasswordStrength(data.password);
    updateData.passwordHash = await bcrypt.hash(data.password, 10);
  }

  if (data.roleId) {
    const roleDef = await prisma.roleDefinition.findUnique({ where: { id: data.roleId } });
    if (roleDef) {
      updateData.roleId = roleDef.id;
      if (roleDef.name === 'Super Admin') updateData.role = Role.SUPER_ADMIN;
      else if (roleDef.name === 'Operations Manager') updateData.role = Role.MANAGER;
      else if (roleDef.name === 'Sales Executive') updateData.role = Role.SALES;
      else if (roleDef.name === 'Procurement Specialist') updateData.role = Role.PURCHASE;
      else if (roleDef.name === 'Accountant') updateData.role = Role.ACCOUNTANT;
    }
  } else if (data.role && Object.values(Role).includes(data.role as Role)) {
    updateData.role = data.role as Role;
    updateData.roleId = null;
  }

  const updated = await prisma.user.update({
    where: { id },
    data: updateData,
    include: { customRole: true },
  });

  return {
    id: updated.id,
    name: updated.name,
    email: updated.email,
    phone: updated.phone,
    avatar: updated.avatar,
    role: updated.role,
    roleId: updated.roleId,
    roleName: updated.customRole?.name || updated.role,
    status: updated.status,
    updatedAt: updated.updatedAt,
  };
}

export async function updateUserStatus(id: string, status: RecordStatus, currentUserId: string) {
  if (id === currentUserId && status === RecordStatus.INACTIVE) {
    throw new AppError(400, 'You cannot deactivate your own account session', 'SELF_DEACTIVATION_PROHIBITED');
  }

  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) throw new AppError(404, 'User not found', 'NOT_FOUND');

  // Prevent deactivating the last active SUPER_ADMIN
  if (user.role === Role.SUPER_ADMIN && status === RecordStatus.INACTIVE) {
    const activeAdmins = await prisma.user.count({
      where: { role: Role.SUPER_ADMIN, status: RecordStatus.ACTIVE },
    });
    if (activeAdmins <= 1) {
      throw new AppError(400, 'Cannot deactivate the last active Super Admin account', 'LAST_ADMIN_PROTECTED');
    }
  }

  const updated = await prisma.user.update({
    where: { id },
    data: { status },
    select: { id: true, name: true, email: true, status: true },
  });

  await recordActivity({
    userId: currentUserId,
    action: 'UPDATE',
    module: 'SETTINGS',
    reference: `User Status: ${user.email} -> ${status}`,
    details: { targetUserId: id, status },
  });

  return updated;
}

export async function updateUserRole(
  id: string,
  rolePayload: { role?: string; roleId?: string },
  currentUserId: string
) {
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) throw new AppError(404, 'User not found', 'NOT_FOUND');

  // Prevent removing own SUPER_ADMIN role
  if (id === currentUserId && user.role === Role.SUPER_ADMIN && rolePayload.role !== Role.SUPER_ADMIN && !rolePayload.roleId) {
    const activeAdmins = await prisma.user.count({
      where: { role: Role.SUPER_ADMIN, status: RecordStatus.ACTIVE },
    });
    if (activeAdmins <= 1) {
      throw new AppError(400, 'Cannot revoke privileges from the last active Super Admin', 'LAST_ADMIN_PROTECTED');
    }
  }

  const result = await updateUser(id, rolePayload);

  await recordActivity({
    userId: currentUserId,
    action: 'UPDATE',
    module: 'SETTINGS',
    reference: `User Role: ${user.email}`,
    details: { targetUserId: id, rolePayload },
  });

  return result;
}

export async function deleteUser(id: string, currentUserId: string) {
  if (id === currentUserId) {
    throw new AppError(400, 'You cannot delete your own active account session', 'SELF_DELETION_PROHIBITED');
  }

  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) throw new AppError(404, 'User not found', 'NOT_FOUND');

  if (user.role === Role.SUPER_ADMIN) {
    const activeAdmins = await prisma.user.count({
      where: { role: Role.SUPER_ADMIN, status: RecordStatus.ACTIVE },
    });
    if (activeAdmins <= 1) {
      throw new AppError(400, 'Cannot delete the last active Super Admin account', 'LAST_ADMIN_PROTECTED');
    }
  }

  await prisma.user.delete({ where: { id } });

  await recordActivity({
    userId: currentUserId,
    action: 'DELETE',
    module: 'SETTINGS',
    reference: `User Deleted: ${user.email}`,
    details: { targetUserId: id, email: user.email, role: user.role },
  });

  return { success: true, message: 'User deleted successfully' };
}
