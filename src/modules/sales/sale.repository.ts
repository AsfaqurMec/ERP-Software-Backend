import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import type { SaleQueryInput } from './sale.validation.js';

export async function findManyPaginated(query: SaleQueryInput) {
  const { page, limit, search, customerId, status, paymentStatus, hasDue, sortBy, sortOrder } = query;

  const where: Prisma.SaleWhereInput = {};

  if (search) {
    where.OR = [
      { invoiceNumber: { contains: search, mode: 'insensitive' } },
      { notes: { contains: search, mode: 'insensitive' } },
      { customer: { name: { contains: search, mode: 'insensitive' } } },
      { customer: { phone: { contains: search, mode: 'insensitive' } } },
      { customer: { address: { contains: search, mode: 'insensitive' } } },
    ];
  }

  if (customerId) where.customerId = customerId;
  if (status) where.status = status;
  if (paymentStatus) where.paymentStatus = paymentStatus;

  if (hasDue) {
    where.dueAmount = { gt: 0 };
    if (!status) where.status = 'CONFIRMED';
  }

  const orderByField = sortBy || 'saleDate';
  const orderBy: Prisma.SaleOrderByWithRelationInput = {
    [orderByField]: sortOrder || 'desc',
  };

  const [data, total] = await Promise.all([
    prisma.sale.findMany({
      where,
      include: {
        customer: { select: { id: true, name: true, phone: true } },
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
    prisma.sale.count({ where }),
  ]);

  return { data, total, page, limit };
}

export async function findById(id: string) {
  return prisma.sale.findUnique({
    where: { id },
    include: {
      customer: true,
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
    prisma.salesReturn.findMany({
      include: {
        sale: {
          include: {
            customer: { select: { id: true, name: true, phone: true } },
          },
        },
        items: true,
      },
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { date: 'desc' },
    }),
    prisma.salesReturn.count(),
  ]);

  return { data, total, page, limit };
}

export async function findReturnById(id: string) {
  return prisma.salesReturn.findUnique({
    where: { id },
    include: {
      sale: {
        include: {
          customer: true,
          items: { include: { product: true } },
        },
      },
      items: true,
    },
  });
}
