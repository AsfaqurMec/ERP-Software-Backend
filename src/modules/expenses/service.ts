import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { buildPaginatedResult, type PaginatedResult } from '../../lib/pagination.js';
import type { CreateExpenseInput, ExpenseQueryInput } from './dto.js';

export async function getExpenses(query: ExpenseQueryInput): Promise<PaginatedResult<any>> {
  const { page, limit, search, category, from, to, sortBy, sortOrder } = query;

  const where: Prisma.ExpenseWhereInput = {};

  if (category) {
    where.category = category;
  }

  if (from || to) {
    where.date = {
      ...(from ? { gte: new Date(from) } : {}),
      ...(to ? { lte: new Date(to) } : {}),
    };
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

  return buildPaginatedResult(data, total, page, limit);
}

export async function createExpense(input: CreateExpenseInput) {
  return prisma.expense.create({
    data: {
      category: input.category,
      amount: new Prisma.Decimal(input.amount),
      date: new Date(input.date),
      paymentMethod: input.paymentMethod,
      description: input.description || null,
      note: input.note || null,
    },
  });
}
