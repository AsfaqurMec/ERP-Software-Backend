import { PartyType, Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { BusinessError, NotFoundError } from '../../lib/errors.js';
import { buildPaginatedResult, type PaginatedResult } from '../../lib/pagination.js';
import type { PaymentQueryInput, RecordPaymentInput } from './dto.js';

export async function getPayments(query: PaymentQueryInput): Promise<PaginatedResult<any>> {
  const { page, limit, search, partyType, method, partyId, sortBy, sortOrder } = query;

  const where: Prisma.PaymentWhereInput = {};

  if (partyType) {
    where.partyType = partyType;
  }
  if (method) {
    where.method = method;
  }
  if (partyId) {
    where.partyId = partyId;
  }

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

  return buildPaginatedResult(data, total, page, limit);
}

export async function getPaymentsOverview() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [customersAgg, suppliersAgg, todayPayments] = await Promise.all([
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

  const totalReceivable = customersAgg._sum.balance || new Prisma.Decimal(0);
  const totalPayable = suppliersAgg._sum.balance || new Prisma.Decimal(0);

  let receivedToday = new Prisma.Decimal(0);
  let paidToday = new Prisma.Decimal(0);

  for (const p of todayPayments) {
    if (p.partyType === PartyType.CUSTOMER) {
      receivedToday = receivedToday.add(p.amount);
    } else {
      paidToday = paidToday.add(p.amount);
    }
  }

  return {
    totalReceivable,
    totalPayable,
    paidToday,
    receivedToday,
    outstandingTotal: totalReceivable.sub(totalPayable),
  };
}

export async function recordPayment(input: RecordPaymentInput) {
  const amount = new Prisma.Decimal(input.amount);
  const paymentDate = new Date(input.date);

  return prisma.$transaction(async (db: any) => {
    if (input.partyType === PartyType.CUSTOMER) {
      const customer = await db.customer.findUnique({ where: { id: input.partyId } });
      if (!customer) {
        throw new NotFoundError('Customer');
      }

      if (customer.balance.lessThan(amount)) {
        throw new BusinessError(
          `Payment amount (${amount.toString()}) cannot exceed customer's outstanding balance (${customer.balance.toString()}).`
        );
      }

      const payment = await db.payment.create({
        data: {
          partyType: PartyType.CUSTOMER,
          partyId: input.partyId,
          customerId: input.partyId,
          amount,
          date: paymentDate,
          method: input.method,
          reference: input.reference || null,
          note: input.note || null,
        },
        include: { customer: true },
      });

      await db.customer.update({
        where: { id: input.partyId },
        data: {
          balance: { decrement: amount },
        },
      });

      return payment;
    } else {
      const supplier = await db.supplier.findUnique({ where: { id: input.partyId } });
      if (!supplier) {
        throw new NotFoundError('Supplier');
      }

      if (supplier.balance.lessThan(amount)) {
        throw new BusinessError(
          `Payment amount (${amount.toString()}) cannot exceed supplier's outstanding balance (${supplier.balance.toString()}).`
        );
      }

      const payment = await db.payment.create({
        data: {
          partyType: PartyType.SUPPLIER,
          partyId: input.partyId,
          supplierId: input.partyId,
          amount,
          date: paymentDate,
          method: input.method,
          reference: input.reference || null,
          note: input.note || null,
        },
        include: { supplier: true },
      });

      await db.supplier.update({
        where: { id: input.partyId },
        data: {
          balance: { decrement: amount },
        },
      });

      return payment;
    }
  });
}
