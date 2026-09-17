import { Prisma } from '@prisma/client';
import { NotFoundError } from '../../lib/errors.js';
import { buildPaginatedResult, type PaginatedResult } from '../../lib/pagination.js';
import * as supplierRepo from './supplier.repository.js';
import type { CreateSupplierInput, SupplierQueryInput, UpdateSupplierInput } from './supplier.validation.js';

export async function getSuppliers(query: SupplierQueryInput): Promise<PaginatedResult<any>> {
  const result = await supplierRepo.findManyPaginated(query);
  return buildPaginatedResult(result.data, result.total, result.page, result.limit);
}

export async function getSupplierById(id: string) {
  const supplier = await supplierRepo.findById(id);
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

  return supplierRepo.create({
    name: input.name,
    company: input.company || null,
    phone: input.phone || null,
    email: input.email || null,
    address: input.address || null,
    openingBalance,
    balance: openingBalance,
    notes: input.notes || null,
    status: input.status,
  });
}

export async function updateSupplier(id: string, input: UpdateSupplierInput) {
  const existing = await supplierRepo.findById(id);
  if (!existing) {
    throw new NotFoundError('Supplier');
  }

  const updateData: Prisma.SupplierUpdateInput = {};

  if (input.name !== undefined) updateData.name = input.name;
  if (input.company !== undefined) updateData.company = input.company;
  if (input.phone !== undefined) updateData.phone = input.phone;
  if (input.email !== undefined) updateData.email = input.email;
  if (input.address !== undefined) updateData.address = input.address;
  if (input.notes !== undefined) updateData.notes = input.notes;
  if (input.status !== undefined) updateData.status = input.status;

  return supplierRepo.update(id, updateData);
}
