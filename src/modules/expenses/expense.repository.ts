import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import type { ExpenseQueryInput } from './expense.validation.js';

export async function findManyPaginated(query: ExpenseQueryInput) {
  const { page, limit, search, category, paymentMethod, from, to, sortBy, sortOrder } = query;

  const where: Prisma.ExpenseWhereInput = {};

  if (category) where.category = category;
  if (paymentMethod) where.paymentMethod = paymentMethod;

  if (from || to) {
    where.date = {};
    if (from) where.date.gte = new Date(from);
    if (to) where.date.lte = new Date(to);
  }

  if (search) {
    where.OR = [
      { category: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } },
      { note: { contains: search, mode: 'insensitive' } },
    ];
  }

  const orderByField = sortBy || 'date';
  const orderBy: Prisma.ExpenseOrderByWithRelationInput = {
    [orderByField]: sortOrder || 'desc',
  };

  const [data, total] = await Promise.all([
    prisma.expense.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy,
    }),
    prisma.expense.count({ where }),
  ]);

  return { data, total, page, limit };
}

export async function create(data: Prisma.ExpenseCreateInput) {
  return prisma.expense.create({ data });
}
