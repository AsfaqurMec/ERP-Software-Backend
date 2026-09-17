import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { NotFoundError } from '../../lib/errors.js';
import { buildPaginatedResult, type PaginatedResult } from '../../lib/pagination.js';
import type { CreateSupplierInput, SupplierQueryInput, UpdateSupplierInput } from './dto.js';

export async function getSuppliers(query: SupplierQueryInput): Promise<PaginatedResult<any>> {
  const { page, limit, search, sortBy, sortOrder } = query;

  const where: Prisma.SupplierWhereInput = {};
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { company: { contains: search, mode: 'insensitive' } },
      { phone: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
    ];
  }

  const orderByField = sortBy || 'createdAt';
  const orderBy: Prisma.SupplierOrderByWithRelationInput = {
    [orderByField]: sortOrder || 'desc',
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

  return buildPaginatedResult(data, total, page, limit);
}

export async function getSupplierById(id: string) {
  const supplier = await prisma.supplier.findUnique({
    where: { id },
    include: {
      purchases: {
        include: {
          items: {
            include: { product: true },
          },
        },
        orderBy: { purchaseDate: 'desc' },
      },
      payments: {
        orderBy: { date: 'desc' },
      },
    },
  });

  if (!supplier) {
    throw new NotFoundError('Supplier');
  }

  const sum = (items: any[], field: string) =>
    items.reduce((acc, item) => acc.add(item[field] || 0), new Prisma.Decimal(0));

  const totalPurchases = sum(supplier.purchases.filter((p: any) => p.status === 'CONFIRMED'), 'grandTotal');
  const totalPaid = sum(supplier.payments, 'amount');

  return {
    ...supplier,
    summary: {
      totalPurchases,
      totalPaid,
      totalDue: supplier.balance,
      purchaseCount: supplier.purchases.length,
      paymentCount: supplier.payments.length,
    },
  };
}

export async function createSupplier(input: CreateSupplierInput) {
  const openingBalance = new Prisma.Decimal(input.openingBalance || 0);

  return prisma.supplier.create({
    data: {
      name: input.name,
      company: input.company || null,
      phone: input.phone || null,
      email: input.email || null,
      address: input.address || null,
      openingBalance,
      balance: openingBalance,
      notes: input.notes || null,
      status: input.status,
    },
  });
}

export async function updateSupplier(id: string, input: UpdateSupplierInput) {
  await getSupplierById(id);

  return prisma.supplier.update({
    where: { id },
    data: {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.company !== undefined ? { company: input.company || null } : {}),
      ...(input.phone !== undefined ? { phone: input.phone || null } : {}),
      ...(input.email !== undefined ? { email: input.email || null } : {}),
      ...(input.address !== undefined ? { address: input.address || null } : {}),
      ...(input.notes !== undefined ? { notes: input.notes || null } : {}),
      ...(input.status !== undefined ? { status: input.status } : {}),
    },
  });
}
