import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { NotFoundError } from '../../lib/errors.js';
import { buildPaginatedResult, type PaginatedResult } from '../../lib/pagination.js';
import type { CreateCustomerInput, CustomerQueryInput, UpdateCustomerInput } from './dto.js';

export async function getCustomers(query: CustomerQueryInput): Promise<PaginatedResult<any>> {
  const { page, limit, search, sortBy, sortOrder } = query;

  const where: Prisma.CustomerWhereInput = {};
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { phone: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
    ];
  }

  const orderByField = sortBy || 'createdAt';
  const orderBy: Prisma.CustomerOrderByWithRelationInput = {
    [orderByField]: sortOrder || 'desc',
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

  return buildPaginatedResult(data, total, page, limit);
}

export async function getCustomerById(id: string) {
  const customer = await prisma.customer.findUnique({
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

  if (!customer) {
    throw new NotFoundError('Customer');
  }

  const sum = (items: any[], field: string) =>
    items.reduce((acc, item) => acc.add(item[field] || 0), new Prisma.Decimal(0));

  const totalSales = sum(customer.sales.filter((s) => s.status === 'CONFIRMED'), 'grandTotal');
  const totalPaid = sum(customer.payments, 'amount');

  let totalReturns = new Prisma.Decimal(0);
  for (const s of customer.sales) {
    if (s.returns) {
      for (const r of s.returns) {
        totalReturns = totalReturns.add(r.total);
      }
    }
  }

  return {
    ...customer,
    summary: {
      totalSales,
      totalPaid,
      totalDue: customer.balance,
      totalReturns,
      salesCount: customer.sales.length,
      paymentCount: customer.payments.length,
    },
  };
}

export async function createCustomer(input: CreateCustomerInput) {
  const openingBalance = new Prisma.Decimal(input.openingBalance || 0);

  return prisma.customer.create({
    data: {
      name: input.name,
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

export async function updateCustomer(id: string, input: UpdateCustomerInput) {
  await getCustomerById(id);

  return prisma.customer.update({
    where: { id },
    data: {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.phone !== undefined ? { phone: input.phone || null } : {}),
      ...(input.email !== undefined ? { email: input.email || null } : {}),
      ...(input.address !== undefined ? { address: input.address || null } : {}),
      ...(input.notes !== undefined ? { notes: input.notes || null } : {}),
      ...(input.status !== undefined ? { status: input.status } : {}),
    },
  });
}
