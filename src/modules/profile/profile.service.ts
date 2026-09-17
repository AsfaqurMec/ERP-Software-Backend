import { prisma } from '../../lib/prisma.js';
import { AppError } from '../../lib/errors.js';
import { resolveUserPermissions } from '../auth/permissions.js';
import { changeUserPassword } from '../auth/auth.js';
import { ensureImageUrl } from '../upload/upload.service.js';

export async function getProfile(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      customRole: true,
      activityLogs: {
        take: 10,
        orderBy: { createdAt: 'desc' },
      },
    },
  });

  if (!user) throw new AppError(404, 'User profile not found', 'NOT_FOUND');

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
    status: user.status,
    permissions,
    lastLoginAt: user.lastLoginAt,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    activityLogs: user.activityLogs,
  };
}

export async function updateProfile(
  userId: string,
  data: { name?: string; email?: string; phone?: string; avatar?: string }
) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new AppError(404, 'User not found', 'NOT_FOUND');

  const updateData: any = {};

  if (data.name) updateData.name = data.name.trim();
  if (data.phone !== undefined) updateData.phone = data.phone?.trim() || null;
  if (data.avatar !== undefined) {
    const avatarUrl = await ensureImageUrl(data.avatar, 'stockpilot/avatars');
    updateData.avatar = avatarUrl || null;
  }

  if (data.email && data.email.toLowerCase().trim() !== user.email) {
    const existing = await prisma.user.findUnique({
      where: { email: data.email.toLowerCase().trim() },
    });
    if (existing) throw new AppError(400, 'Email address is already in use by another account', 'DUPLICATE_EMAIL');
    updateData.email = data.email.toLowerCase().trim();
  }

  const updated = await prisma.user.update({
    where: { id: userId },
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

export async function changePassword(userId: string, currentPass: string, newPass: string) {
  return changeUserPassword(userId, currentPass, newPass);
}
