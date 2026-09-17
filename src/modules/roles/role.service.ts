import { prisma } from '../../lib/prisma.js';
import { AppError } from '../../lib/errors.js';
import { ALL_PERMISSIONS, DEFAULT_ROLE_PERMISSIONS } from '../auth/permissions.js';

export async function seedSystemRoles() {
  const systemRoles = [
    {
      name: 'Super Admin',
      description: 'Unrestricted full access across all operations, security settings, and audits',
      isSystem: true,
      permissions: ['*'],
    },
    {
      name: 'Operations Manager',
      description: 'Full managerial access to inventory, sales, purchasing, and business reporting',
      isSystem: true,
      permissions: DEFAULT_ROLE_PERMISSIONS.MANAGER,
    },
    {
      name: 'Sales Executive',
      description: 'Create sales orders, manage customers, and collect sales payments',
      isSystem: true,
      permissions: DEFAULT_ROLE_PERMISSIONS.SALES,
    },
    {
      name: 'Procurement Specialist',
      description: 'Create purchase orders, manage suppliers, and record disbursements',
      isSystem: true,
      permissions: DEFAULT_ROLE_PERMISSIONS.PURCHASE,
    },
    {
      name: 'Accountant',
      description: 'Manage payments ledger, record operating expenses, and audit financial statements',
      isSystem: true,
      permissions: DEFAULT_ROLE_PERMISSIONS.ACCOUNTANT,
    },
  ];

  for (const role of systemRoles) {
    await prisma.roleDefinition.upsert({
      where: { name: role.name },
      update: {
        description: role.description,
        permissions: role.permissions,
        isSystem: true,
      },
      create: {
        name: role.name,
        description: role.description,
        permissions: role.permissions,
        isSystem: true,
      },
    });
  }
}

export async function listRoles() {
  await seedSystemRoles();

  const roles = await prisma.roleDefinition.findMany({
    include: {
      _count: {
        select: { users: true },
      },
    },
    orderBy: [{ isSystem: 'desc' }, { name: 'asc' }],
  });

  return {
    items: roles.map((r: any) => ({
      id: r.id,
      name: r.name,
      description: r.description,
      permissions: r.permissions,
      isSystem: r.isSystem,
      userCount: r._count.users,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    })),
    allAvailablePermissions: ALL_PERMISSIONS,
  };
}

export async function getRoleById(id: string) {
  const role = await prisma.roleDefinition.findUnique({
    where: { id },
    include: {
      users: {
        select: {
          id: true,
          name: true,
          email: true,
          avatar: true,
          status: true,
          role: true,
        },
      },
    },
  });

  if (!role) {
    throw new AppError(404, 'Role definition not found', 'NOT_FOUND');
  }

  return {
    ...role,
    allAvailablePermissions: ALL_PERMISSIONS,
  };
}

export async function createRole(data: { name: string; description?: string; permissions: string[] }) {
  if (!data.name || data.name.trim().length === 0) {
    throw new AppError(400, 'Role name is required', 'VALIDATION_ERROR');
  }

  const existing = await prisma.roleDefinition.findUnique({
    where: { name: data.name.trim() },
  });

  if (existing) {
    throw new AppError(400, 'A role with this name already exists', 'DUPLICATE_ROLE');
  }

  return prisma.roleDefinition.create({
    data: {
      name: data.name.trim(),
      description: data.description?.trim(),
      permissions: data.permissions || [],
      isSystem: false,
    },
  });
}

export async function updateRole(
  id: string,
  data: { name?: string; description?: string; permissions?: string[] }
) {
  const role = await prisma.roleDefinition.findUnique({ where: { id } });
  if (!role) throw new AppError(404, 'Role not found', 'NOT_FOUND');

  if (data.name && data.name.trim() !== role.name) {
    const existing = await prisma.roleDefinition.findUnique({
      where: { name: data.name.trim() },
    });
    if (existing) throw new AppError(400, 'A role with this name already exists', 'DUPLICATE_ROLE');
  }

  return prisma.roleDefinition.update({
    where: { id },
    data: {
      name: data.name?.trim(),
      description: data.description?.trim(),
      permissions: data.permissions !== undefined ? data.permissions : undefined,
    },
  });
}

export async function deleteRole(id: string) {
  const role = await prisma.roleDefinition.findUnique({
    where: { id },
    include: { _count: { select: { users: true } } },
  });

  if (!role) throw new AppError(404, 'Role not found', 'NOT_FOUND');

  if (role.isSystem) {
    throw new AppError(400, 'Default system roles cannot be deleted', 'SYSTEM_ROLE_PROTECTED');
  }

  if (role._count.users > 0) {
    throw new AppError(
      400,
      `Cannot delete role because it is currently assigned to ${role._count.users} user(s). Reassign them first.`,
      'ROLE_IN_USE'
    );
  }

  await prisma.roleDefinition.delete({ where: { id } });
  return { success: true, message: 'Role deleted successfully' };
}
