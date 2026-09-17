import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { buildPaginatedResult } from '../../lib/pagination.js';

export interface RecordActivityParams {
  userId?: string | null;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'CANCEL' | 'RETURN' | 'PAYMENT' | 'SETTINGS_CHANGE';
  module: 'PRODUCTS' | 'CATEGORIES' | 'SALES' | 'PURCHASES' | 'INVENTORY' | 'CUSTOMERS' | 'SUPPLIERS' | 'PAYMENTS' | 'EXPENSES' | 'SETTINGS';
  reference?: string | null;
  details?: Record<string, any> | null;
  ip?: string | null;
}

export async function recordActivity(params: RecordActivityParams) {
  try {
    return await prisma.activityLog.create({
      data: {
        userId: params.userId || null,
        action: params.action,
        module: params.module,
        reference: params.reference || null,
        details: params.details ? (params.details as Prisma.InputJsonValue) : Prisma.JsonNull,
        ip: params.ip || null,
      },
    });
  } catch (err) {
    console.error('Failed to write activity log:', err);
    return null;
  }
}

export async function getActivityLogs(query: {
  page?: number;
  limit?: number;
  module?: string;
  action?: string;
  userId?: string;
  search?: string;
}) {
  const page = query.page || 1;
  const limit = query.limit || 25;

  const where: Prisma.ActivityLogWhereInput = {};
  if (query.module) where.module = query.module;
  if (query.action) where.action = query.action;
  if (query.userId) where.userId = query.userId;

  if (query.search) {
    where.OR = [
      { reference: { contains: query.search, mode: 'insensitive' } },
      { action: { contains: query.search, mode: 'insensitive' } },
      { module: { contains: query.search, mode: 'insensitive' } },
      { user: { name: { contains: query.search, mode: 'insensitive' } } },
    ];
  }

  const [data, total] = await Promise.all([
    prisma.activityLog.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, email: true, role: true } },
      },
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.activityLog.count({ where }),
  ]);

  return buildPaginatedResult(data, total, page, limit);
}
