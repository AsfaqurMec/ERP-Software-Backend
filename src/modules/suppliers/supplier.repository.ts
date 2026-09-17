import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import type { SupplierQueryInput } from './supplier.validation.js';

export async function findManyPaginated(query: SupplierQueryInput) {
  const { page, limit, search, status, sortBy, sortOrder } = query;

  const where: Prisma.SupplierWhereInput = {};

  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { company: { contains: search, mode: 'insensitive' } },
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
  const orderBy: Prisma.SupplierOrderByWithRelationInput = {
    [orderByField]: sortOrder || 'asc',
  };

  const [data, total] = await Promise.all([
    prisma.supplier.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy,
    }),
    prisma.supplier.count({ where }),
  ]);

  return { data, total, page, limit };
}

export async function findById(id: string) {
  return prisma.supplier.findUnique({
    where: { id },
    include: {
      purchases: {
        orderBy: { purchaseDate: 'desc' },
      },
      payments: {
        orderBy: { date: 'desc' },
      },
    },
  });
}

export async function create(data: Prisma.SupplierCreateInput) {
  return prisma.supplier.create({ data });
}

export async function update(id: string, data: Prisma.SupplierUpdateInput) {
  return prisma.supplier.update({ where: { id }, data });
}
