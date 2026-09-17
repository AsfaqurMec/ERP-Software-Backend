import { PartyType, Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { BusinessError, NotFoundError } from '../../lib/errors.js';
import { recordActivity } from '../audit/audit.service.js';
import { buildPaginatedResult, type PaginatedResult } from '../../lib/pagination.js';
import * as paymentRepo from './payment.repository.js';
import type { PaymentQueryInput, RecordPaymentInput } from './payment.validation.js';

export async function getPayments(query: PaymentQueryInput): Promise<PaginatedResult<any>> {
  const result = await paymentRepo.findManyPaginated(query);
  return buildPaginatedResult(result.data, result.total, result.page, result.limit);
}

export async function getPaymentsOverview() {
  const [customersAgg, suppliersAgg, todayPayments] = await paymentRepo.getOverviewBalances();

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

  const result = await prisma.$transaction(async (db: any) => {
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
          saleId: input.saleId || null,
          amount,
          date: paymentDate,
          method: input.method,
          reference: input.reference || null,
          note: input.note || null,
        },
        include: { customer: true, sale: true },
      });

      await db.customer.update({
        where: { id: input.partyId },
        data: {
          balance: { decrement: amount },
        },
      });

      // If tied to a specific sale invoice, update sale status
      if (input.saleId) {
        const sale = await db.sale.findUnique({ where: { id: input.saleId } });
        if (sale) {
          const newPaid = sale.paidAmount.add(amount);
          const newDue = sale.grandTotal.sub(newPaid);
          const newPaymentStatus = newDue.lte(0) ? 'PAID' : 'PARTIAL';
          await db.sale.update({
            where: { id: input.saleId },
            data: {
              paidAmount: newPaid,
              dueAmount: newDue.lte(0) ? new Prisma.Decimal(0) : newDue,
              paymentStatus: newPaymentStatus,
            },
          });
        }
      }

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
          purchaseId: input.purchaseId || null,
          amount,
          date: paymentDate,
          method: input.method,
          reference: input.reference || null,
          note: input.note || null,
        },
        include: { supplier: true, purchase: true },
      });

      await db.supplier.update({
        where: { id: input.partyId },
        data: {
          balance: { decrement: amount },
        },
      });

      // If tied to a specific purchase order, update purchase status
      if (input.purchaseId) {
        const purchase = await db.purchase.findUnique({ where: { id: input.purchaseId } });
        if (purchase) {
          const newPaid = purchase.paidAmount.add(amount);
          const newDue = purchase.grandTotal.sub(newPaid);
          const newPaymentStatus = newDue.lte(0) ? 'PAID' : 'PARTIAL';
          await db.purchase.update({
            where: { id: input.purchaseId },
            data: {
              paidAmount: newPaid,
              dueAmount: newDue.lte(0) ? new Prisma.Decimal(0) : newDue,
              paymentStatus: newPaymentStatus,
            },
          });
        }
      }

      return payment;
    }
  });

  await recordActivity({
    action: 'PAYMENT',
    module: 'PAYMENTS',
    reference: `Payment ${result.id} (${input.partyType})`,
    details: { paymentId: result.id, partyType: input.partyType, partyId: input.partyId, amount: input.amount, method: input.method },
  });

  return result;
}
