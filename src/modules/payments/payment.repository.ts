import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import type { PaymentQueryInput } from './payment.validation.js';

export async function findManyPaginated(query: PaymentQueryInput) {
  const { page, limit, search, partyType, method, partyId, sortBy, sortOrder } = query;

  const where: Prisma.PaymentWhereInput = {};

  if (partyType) where.partyType = partyType;
  if (method) where.method = method;
  if (partyId) where.partyId = partyId;

  if (search) {
    where.OR = [
      { reference: { contains: search, mode: 'insensitive' } },
      { note: { contains: search, mode: 'insensitive' } },
      { customer: { name: { contains: search, mode: 'insensitive' } } },
      { supplier: { name: { contains: search, mode: 'insensitive' } } },
    ];
  }

  const orderByField = sortBy || 'date';
  const orderBy: Prisma.PaymentOrderByWithRelationInput = {
    [orderByField]: sortOrder || 'desc',
  };

  const [data, total] = await Promise.all([
    prisma.payment.findMany({
      where,
      include: {
        customer: { select: { id: true, name: true, phone: true } },
        supplier: { select: { id: true, name: true, company: true } },
        sale: { select: { id: true, invoiceNumber: true } },
        purchase: { select: { id: true, purchaseNumber: true } },
      },
      skip: (page - 1) * limit,
      take: limit,
      orderBy,
    }),
    prisma.payment.count({ where }),
  ]);

  return { data, total, page, limit };
}

export async function getOverviewBalances() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return Promise.all([
    prisma.customer.aggregate({
      _sum: { balance: true },
    }),
    prisma.supplier.aggregate({
      _sum: { balance: true },
    }),
    prisma.payment.findMany({
      where: {
        date: { gte: today },
      },
    }),
  ]);
}
