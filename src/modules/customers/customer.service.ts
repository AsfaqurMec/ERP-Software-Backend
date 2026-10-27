import { Prisma } from '@prisma/client';
import { NotFoundError } from '../../lib/errors.js';
import { buildPaginatedResult, type PaginatedResult } from '../../lib/pagination.js';
import * as customerRepo from './customer.repository.js';
import type { CreateCustomerInput, CustomerQueryInput, UpdateCustomerInput } from './customer.validation.js';
import { evaluateCustomerCreditRisk } from './credit-risk.service.js';

export async function getCustomers(query: CustomerQueryInput): Promise<PaginatedResult<any>> {
  const result = await customerRepo.findManyPaginated(query);
  const enhanced = result.data.map((c: any) => {
    const bal = Number(c.balance || 0);
    let riskLevel = 'LOW';
    if (bal > 40000) riskLevel = 'HIGH';
    else if (bal > 10000) riskLevel = 'MEDIUM';
    return {
      ...c,
      riskLevel,
    };
  });
  return buildPaginatedResult(enhanced, result.total, result.page, result.limit);
}

export async function getCustomerCreditRisk(id: string) {
  return evaluateCustomerCreditRisk(id);
}

export async function getCustomerById(id: string) {
  const customer = await customerRepo.findById(id);
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

  const creditRisk = await evaluateCustomerCreditRisk(id).catch(() => null);

  return {
    ...customer,
    creditRisk,
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

  return customerRepo.create({
    name: input.name,
    phone: input.phone || null,
    email: input.email || null,
    address: input.address || null,
    openingBalance,
    balance: openingBalance,
    notes: input.notes || null,
    status: input.status,
  });
}

export async function updateCustomer(id: string, input: UpdateCustomerInput) {
  const existing = await customerRepo.findById(id);
  if (!existing) {
    throw new NotFoundError('Customer');
  }

  const updateData: Prisma.CustomerUpdateInput = {};

  if (input.name !== undefined) updateData.name = input.name;
  if (input.phone !== undefined) updateData.phone = input.phone;
  if (input.email !== undefined) updateData.email = input.email;
  if (input.address !== undefined) updateData.address = input.address;
  if (input.notes !== undefined) updateData.notes = input.notes;
  if (input.status !== undefined) updateData.status = input.status;

  return customerRepo.update(id, updateData);
}
