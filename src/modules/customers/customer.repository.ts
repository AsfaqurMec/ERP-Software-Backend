import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import type { CustomerQueryInput } from './customer.validation.js';

export async function findManyPaginated(query: CustomerQueryInput) {
  const { page, limit, search, status, sortBy, sortOrder } = query;

  const where: Prisma.CustomerWhereInput = {};

  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { phone: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
      { address: { contains: search, mode: 'insensitive' } },
      { notes: { contains: search, mode: 'insensitive' } },
    ];
  }

  if (status) {
    where.status = status;
  }

  const orderByField = sortBy || 'name';
  const orderBy: Prisma.CustomerOrderByWithRelationInput = {
    [orderByField]: sortOrder || 'asc',
  };

  const [data, total] = await Promise.all([
    prisma.customer.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy,
    }),
    prisma.customer.count({ where }),
  ]);

  return { data, total, page, limit };
}

export async function findById(id: string) {
  return prisma.customer.findUnique({
    where: { id },
    include: {
      sales: {
        include: {
          items: {
            include: { product: true },
          },
          returns: true,
        },
        orderBy: { saleDate: 'desc' },
      },
      payments: {
        orderBy: { date: 'desc' },
      },
    },
  });
}

export async function create(data: Prisma.CustomerCreateInput) {
  return prisma.customer.create({ data });
}

export async function update(id: string, data: Prisma.CustomerUpdateInput) {
  return prisma.customer.update({ where: { id }, data });
}
