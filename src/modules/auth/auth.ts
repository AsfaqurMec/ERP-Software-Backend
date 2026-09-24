import bcrypt from 'bcryptjs';
import { SignJWT, jwtVerify } from 'jose';
import type { NextFunction, Request, Response } from 'express';
import { prisma, Role } from '../../lib/prisma.js';
import { AppError } from '../../lib/errors.js';
import { resolveUserPermissions } from './permissions.js';

export {
  requirePermission,
  hasUserPermission,
  resolveUserPermissions,
  type Permission,
  ALL_PERMISSIONS,
  DEFAULT_ROLE_PERMISSIONS,
  GUEST_READ_PERMISSIONS,
} from './permissions.js';

export const GUEST_EMAIL = 'guest@stockpilot.io';

const jwtSecretEnv = process.env.JWT_SECRET;
if (!jwtSecretEnv || jwtSecretEnv.length < 32 || jwtSecretEnv === 'development-secret-change-me') {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('FATAL: JWT_SECRET environment variable must be set with at least 32 characters in production.');
  } else {
    console.warn('⚠️ WARNING: Using fallback development JWT secret. Set JWT_SECRET in .env with at least 32 characters for production security.');
  }
}
const secret = new TextEncoder().encode(jwtSecretEnv || 'development-secret-change-me-min-32-chars-long!');

export function validatePasswordStrength(password: string): void {
  if (!password || password.length < 8) {
    throw new AppError(400, 'Password must be at least 8 characters long', 'WEAK_PASSWORD');
  }
  if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
    throw new AppError(400, 'Password must contain both letters and numbers', 'WEAK_PASSWORD');
  }
}

function getPasswordSignature(passwordHash: string): string {
  return passwordHash ? passwordHash.slice(-10) : '';
}

export async function createToken(user: { id: string; role: string; passwordHash?: string; isGuest?: boolean }) {
  const pwdSig = user.passwordHash ? getPasswordSignature(user.passwordHash) : undefined;
  const isGuest = Boolean(user.isGuest);
  return new SignJWT({ role: user.role, isGuest, pwdSig })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime('14d')
    .sign(secret);
}

export async function authenticate(req: Request, _res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError(401, 'Authentication required', 'UNAUTHORIZED');
    }
    const raw = authHeader.substring(7).trim();
    if (!raw) throw new AppError(401, 'Authentication required', 'UNAUTHORIZED');

    let payload: any;
    try {
      const verified = await jwtVerify(raw, secret);
      payload = verified.payload;
    } catch {
      throw new AppError(401, 'Session has expired or token is invalid', 'UNAUTHORIZED');
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.sub as string },
      include: { customRole: true },
    });
    if (!user || user.status !== 'ACTIVE') {
      throw new AppError(401, 'Session is invalid or account is deactivated', 'UNAUTHORIZED');
    }

    // Invalidate session if password was changed after token issuance
    if (payload.pwdSig && user.passwordHash && payload.pwdSig !== getPasswordSignature(user.passwordHash)) {
      throw new AppError(401, 'Session invalidated due to password change. Please log in again.', 'UNAUTHORIZED');
    }

    const isGuest = Boolean(payload.isGuest || user.email === GUEST_EMAIL);
    (req as any).user = {
      ...user,
      isGuest,
    };

    // Guest mode is strictly view-only: reject any non-idempotent or mutating HTTP methods
    if (isGuest && !['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
      throw new AppError(403, 'Guest mode is view-only. You cannot create, edit, or delete records.', 'GUEST_VIEW_ONLY');
    }

    next();
  } catch (e) {
    next(e);
  }
}

export function authorize(...roles: string[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const user = (req as any).user;
    if (!user || !roles.includes(user.role)) {
      return next(new AppError(403, 'You do not have permission for this action', 'FORBIDDEN'));
    }
    next();
  };
}

export async function login(email: string, password: string) {
  const user = await prisma.user.findUnique({
    where: { email },
    include: { customRole: true },
  });

  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    throw new AppError(401, 'Invalid email or password', 'UNAUTHORIZED');
  }

  if (user.status !== 'ACTIVE') {
    throw new AppError(403, 'Your account has been deactivated. Please contact an administrator.', 'ACCOUNT_DEACTIVATED');
  }

  // Update last login timestamp
  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  const isGuest = user.email === GUEST_EMAIL;
  const permissions = resolveUserPermissions({ ...user, isGuest });

  return {
    token: await createToken({ ...user, isGuest }),
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      avatar: user.avatar,
      role: user.role,
      roleId: user.roleId,
      customRole: user.customRole ? { id: user.customRole.id, name: user.customRole.name } : null,
      permissions,
      isGuest,
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
    },
  };
}

export async function loginAsGuest() {
  let user = await prisma.user.findUnique({
    where: { email: GUEST_EMAIL },
    include: { customRole: true },
  });

  if (!user) {
    const dummyPasswordHash = await bcrypt.hash('GuestSuperAdmin@2026!', 10);
    user = await prisma.user.create({
      data: {
        name: 'Guest Super Admin',
        email: GUEST_EMAIL,
        passwordHash: dummyPasswordHash,
        role: Role.SUPER_ADMIN,
        status: 'ACTIVE',
      },
      include: { customRole: true },
    });
  } else if (user.status !== 'ACTIVE' || user.role !== Role.SUPER_ADMIN) {
    user = await prisma.user.update({
      where: { id: user.id },
      data: {
        status: 'ACTIVE',
        role: Role.SUPER_ADMIN,
      },
      include: { customRole: true },
    });
  }

  // Update last login timestamp safely
  try {
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });
  } catch {}

  const permissions = resolveUserPermissions({ ...user, isGuest: true });

  const token = await createToken({
    id: user.id,
    role: user.role,
    passwordHash: user.passwordHash,
    isGuest: true,
  });

  return {
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      avatar: user.avatar,
      role: user.role,
      roleId: user.roleId,
      customRole: user.customRole ? { id: user.customRole.id, name: user.customRole.name } : null,
      permissions,
      isGuest: true,
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
    },
  };
}

export async function getCurrentUser(userId: string, isGuestToken = false) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { customRole: true },
  });

  if (!user || user.status !== 'ACTIVE') {
    throw new AppError(401, 'User session not found or inactive', 'UNAUTHORIZED');
  }

  const isGuest = Boolean(isGuestToken || user.email === GUEST_EMAIL);
  const permissions = resolveUserPermissions({ ...user, isGuest });

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    avatar: user.avatar,
    role: user.role,
    roleId: user.roleId,
    customRole: user.customRole ? { id: user.customRole.id, name: user.customRole.name } : null,
    permissions,
    isGuest,
    status: user.status,
    lastLoginAt: user.lastLoginAt,
    createdAt: user.createdAt,
  };
}

export async function changeUserPassword(userId: string, currentPass: string, newPass: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new AppError(404, 'User not found', 'NOT_FOUND');

  const isValid = await bcrypt.compare(currentPass, user.passwordHash);
  if (!isValid) {
    throw new AppError(400, 'Current password is incorrect', 'INVALID_CREDENTIALS');
  }

  validatePasswordStrength(newPass);

  const passwordHash = await bcrypt.hash(newPass, 10);
  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash },
  });

  return { success: true, message: 'Password updated successfully' };
}
