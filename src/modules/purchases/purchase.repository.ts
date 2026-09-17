import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import type { PurchaseQueryInput } from './purchase.validation.js';

export async function findManyPaginated(query: PurchaseQueryInput) {
  const { page, limit, search, supplierId, status, paymentStatus, hasDue, sortBy, sortOrder } = query;

  const where: Prisma.PurchaseWhereInput = {};

  if (search) {
    where.OR = [
      { purchaseNumber: { contains: search, mode: 'insensitive' } },
      { invoiceNumber: { contains: search, mode: 'insensitive' } },
      { notes: { contains: search, mode: 'insensitive' } },
      { supplier: { name: { contains: search, mode: 'insensitive' } } },
      { supplier: { company: { contains: search, mode: 'insensitive' } } },
      { supplier: { phone: { contains: search, mode: 'insensitive' } } },
    ];
  }

  if (supplierId) where.supplierId = supplierId;
  if (status) where.status = status;
  if (paymentStatus) where.paymentStatus = paymentStatus;

  if (hasDue) {
    where.dueAmount = { gt: 0 };
    if (!status) where.status = 'CONFIRMED';
  }

  const orderByField = sortBy || 'purchaseDate';
  const orderBy: Prisma.PurchaseOrderByWithRelationInput = {
    [orderByField]: sortOrder || 'desc',
  };

  const [data, total] = await Promise.all([
    prisma.purchase.findMany({
      where,
      include: {
        supplier: { select: { id: true, name: true, company: true } },
        items: {
          include: {
            product: { select: { id: true, name: true, sku: true, unit: true } },
          },
        },
      },
      skip: (page - 1) * limit,
      take: limit,
      orderBy,
    }),
    prisma.purchase.count({ where }),
  ]);

  return { data, total, page, limit };
}

export async function findById(id: string) {
  return prisma.purchase.findUnique({
    where: { id },
    include: {
      supplier: true,
      items: {
        include: { product: true },
      },
      payments: {
        orderBy: { date: 'desc' },
      },
      returns: {
        include: { items: true },
        orderBy: { date: 'desc' },
      },
    },
  });
}

export async function findReturnsPaginated(page = 1, limit = 20) {
  const [data, total] = await Promise.all([
    prisma.purchaseReturn.findMany({
      include: {
        purchase: {
          include: {
            supplier: { select: { id: true, name: true, company: true } },
          },
        },
        items: true,
      },
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { date: 'desc' },
    }),
    prisma.purchaseReturn.count(),
  ]);

  return { data, total, page, limit };
}

export async function findReturnById(id: string) {
  return prisma.purchaseReturn.findUnique({
    where: { id },
    include: {
      purchase: {
        include: {
          supplier: true,
          items: { include: { product: true } },
        },
      },
      items: true,
    },
  });
}
