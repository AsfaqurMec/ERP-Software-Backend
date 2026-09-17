import { DocumentStatus, MovementType, PartyType, PaymentMethod, PaymentStatus, Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { BusinessError, NotFoundError } from '../../lib/errors.js';
import { adjustStock } from '../inventory/service.js';
import { buildPaginatedResult, type PaginatedResult } from '../../lib/pagination.js';
import type { CreatePurchaseInput, PurchaseQueryInput, PurchaseReturnInput } from './dto.js';

function computePaymentStatus(grandTotal: Prisma.Decimal, paidAmount: Prisma.Decimal): PaymentStatus {
  if (paidAmount.greaterThanOrEqualTo(grandTotal)) return PaymentStatus.PAID;
  if (paidAmount.greaterThan(0)) return PaymentStatus.PARTIAL;
  return PaymentStatus.UNPAID;
}

export async function getPurchases(query: PurchaseQueryInput): Promise<PaginatedResult<any>> {
  const { page, limit, search, supplierId, status, paymentStatus, sortBy, sortOrder } = query;

  const where: Prisma.PurchaseWhereInput = {};

  if (search) {
    where.OR = [
      { purchaseNumber: { contains: search, mode: 'insensitive' } },
      { invoiceNumber: { contains: search, mode: 'insensitive' } },
      { supplier: { name: { contains: search, mode: 'insensitive' } } },
    ];
  }

  if (supplierId) {
    where.supplierId = supplierId;
  }
  if (status) {
    where.status = status;
  }
  if (paymentStatus) {
    where.paymentStatus = paymentStatus;
  }

  const orderByField = sortBy || 'purchaseDate';
  const orderBy: Prisma.PurchaseOrderByWithRelationInput = {
    [orderByField]: sortOrder || 'desc',
  };

  const [data, total] = await Promise.all([
    prisma.purchase.findMany({
      where,
      include: {
        supplier: { select: { id: true, name: true, company: true } },
        items: {
          include: {
            product: { select: { id: true, name: true, sku: true, unit: true } },
          },
        },
      },
      skip: (page - 1) * limit,
      take: limit,
      orderBy,
    }),
    prisma.purchase.count({ where }),
  ]);

  return buildPaginatedResult(data, total, page, limit);
}

export async function getPurchaseById(id: string) {
  const purchase = await prisma.purchase.findUnique({
    where: { id },
    include: {
      supplier: true,
      items: {
        include: {
          product: true,
        },
      },
      payments: {
        orderBy: { date: 'desc' },
      },
      returns: {
        include: {
          items: true,
        },
        orderBy: { date: 'desc' },
      },
    },
  });

  if (!purchase) {
    throw new NotFoundError('Purchase');
  }

  return purchase;
}

export async function createPurchase(input: CreatePurchaseInput) {
  const supplier = await prisma.supplier.findUnique({ where: { id: input.supplierId } });
  if (!supplier) {
    throw new NotFoundError('Supplier');
  }

  const discount = new Prisma.Decimal(input.discount || 0);
  const tax = new Prisma.Decimal(input.tax || 0);
  const shipping = new Prisma.Decimal(input.shipping || 0);
  const paidAmount = new Prisma.Decimal(input.paidAmount || 0);

  const calculatedItems = input.items.map((item) => {
    const unitCost = new Prisma.Decimal(item.unitCost);
    const quantity = new Prisma.Decimal(item.quantity);
    const itemDiscount = new Prisma.Decimal(item.discount || 0);
    const itemTax = new Prisma.Decimal(item.tax || 0);
    const subtotal = unitCost.mul(quantity);
    const total = subtotal.sub(itemDiscount).add(itemTax);

    return {
      productId: item.productId,
      quantity,
      unitCost,
      discount: itemDiscount,
      tax: itemTax,
      subtotal,
      total,
    };
  });

  const subtotal = calculatedItems.reduce((acc, item) => acc.add(item.subtotal), new Prisma.Decimal(0));
  const grandTotal = subtotal.sub(discount).add(tax).add(shipping);

  if (paidAmount.greaterThan(grandTotal)) {
    throw new BusinessError('Paid amount cannot exceed the grand total.');
  }

  const dueAmount = grandTotal.sub(paidAmount);
  const isConfirmed = input.status === 'CONFIRMED';
  const purchaseDate = new Date(input.purchaseDate);

  return prisma.$transaction(async (db: any) => {
    const count = await db.purchase.count();
    const purchaseNumber = `PUR-${String(count + 1).padStart(6, '0')}`;

    const purchase = await db.purchase.create({
      data: {
        purchaseNumber,
        invoiceNumber: input.invoiceNumber || null,
        supplierId: input.supplierId,
        purchaseDate,
        status: isConfirmed ? DocumentStatus.CONFIRMED : DocumentStatus.DRAFT,
        paymentStatus: computePaymentStatus(grandTotal, paidAmount),
        subtotal,
        discount,
        tax,
        shipping,
        grandTotal,
        paidAmount,
        dueAmount,
        paymentMethod: input.paymentMethod || null,
        notes: input.notes || null,
        items: {
          create: calculatedItems.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            unitCost: item.unitCost,
            discount: item.discount,
            tax: item.tax,
            subtotal: item.subtotal,
            total: item.total,
          })),
        },
      },
      include: {
        supplier: true,
        items: {
          include: { product: true },
        },
      },
    });

    if (isConfirmed) {
      for (const item of calculatedItems) {
        await adjustStock(db, {
          productId: item.productId,
          quantity: item.quantity,
          type: MovementType.PURCHASE,
          unitCost: item.unitCost,
          referenceType: 'PURCHASE',
          referenceId: purchase.id,
          reason: `Procurement order ${purchase.purchaseNumber}`,
          date: purchaseDate,
        });
      }

      await db.supplier.update({
        where: { id: input.supplierId },
        data: {
          balance: { increment: dueAmount },
        },
      });

      if (paidAmount.gt(0)) {
        await db.payment.create({
          data: {
            partyType: PartyType.SUPPLIER,
            partyId: input.supplierId,
            supplierId: input.supplierId,
            purchaseId: purchase.id,
            amount: paidAmount,
            date: purchaseDate,
            method: input.paymentMethod || PaymentMethod.CASH,
            reference: purchase.purchaseNumber,
            note: `Initial payment for ${purchase.purchaseNumber}`,
          },
        });
      }
    }

    return purchase;
  });
}

export async function cancelDraftPurchase(id: string) {
  const purchase = await prisma.purchase.findUnique({ where: { id } });
  if (!purchase) {
    throw new NotFoundError('Purchase');
  }

  if (purchase.status !== DocumentStatus.DRAFT) {
    throw new BusinessError('Only draft purchases can be cancelled. Confirmed purchases must use a purchase return.');
  }

  return prisma.purchase.update({
    where: { id },
    data: { status: DocumentStatus.CANCELLED },
  });
}

export async function getPurchaseReturns(query?: { page?: number; limit?: number }) {
  const page = query?.page || 1;
  const limit = query?.limit || 20;

  const [data, total] = await Promise.all([
    prisma.purchaseReturn.findMany({
      include: {
        purchase: {
          include: {
            supplier: { select: { id: true, name: true, company: true } },
          },
        },
        items: true,
      },
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { date: 'desc' },
    }),
    prisma.purchaseReturn.count(),
  ]);

  return buildPaginatedResult(data, total, page, limit);
}

export async function getPurchaseReturnById(id: string) {
  const purchaseReturn = await prisma.purchaseReturn.findUnique({
    where: { id },
    include: {
      purchase: {
        include: {
          supplier: true,
          items: { include: { product: true } },
        },
      },
      items: true,
    },
  });

  if (!purchaseReturn) {
    throw new NotFoundError('Purchase Return');
  }

  return purchaseReturn;
}

export async function createPurchaseReturn(input: PurchaseReturnInput) {
  return prisma.$transaction(async (db: any) => {
    const purchase = await db.purchase.findUnique({
      where: { id: input.purchaseId },
      include: { items: true },
    });

    if (!purchase) {
      throw new NotFoundError('Purchase');
    }

    if (purchase.status !== DocumentStatus.CONFIRMED) {
      throw new BusinessError('Only confirmed purchases can be returned.');
    }

    let returnTotal = new Prisma.Decimal(0);
    const returnRows: {
      purchaseItemId: string;
      productId: string;
      quantity: Prisma.Decimal;
      total: Prisma.Decimal;
      unitCost: Prisma.Decimal;
    }[] = [];

    for (const reqItem of input.items) {
      const item = (purchase.items as any[]).find((i: any) => i.id === reqItem.purchaseItemId);
      if (!item) {
        throw new BusinessError('Return item does not belong to this purchase.');
      }

      const prevReturns = await db.purchaseReturnItem.aggregate({
        where: { purchaseItemId: item.id },
        _sum: { quantity: true },
      });

      const alreadyReturned = prevReturns._sum.quantity || new Prisma.Decimal(0);
      const returnQty = new Prisma.Decimal(reqItem.quantity);

      if (alreadyReturned.add(returnQty).greaterThan(item.quantity)) {
        throw new BusinessError(`Return quantity (${returnQty}) exceeds the original purchased quantity (${item.quantity}).`);
      }

      const lineTotal = item.total.div(item.quantity).mul(returnQty);
      returnRows.push({
        purchaseItemId: item.id,
        productId: item.productId,
        quantity: returnQty,
        total: lineTotal,
        unitCost: item.unitCost,
      });

      returnTotal = returnTotal.add(lineTotal);
    }

    const returnDate = new Date(input.date);
    const purchaseReturn = await db.purchaseReturn.create({
      data: {
        purchaseId: purchase.id,
        date: returnDate,
        reason: input.reason,
        note: input.note || null,
        total: returnTotal,
        items: {
          create: returnRows.map((r) => ({
            purchaseItemId: r.purchaseItemId,
            productId: r.productId,
            quantity: r.quantity,
            total: r.total,
          })),
        },
      },
      include: { items: true, purchase: { include: { supplier: true } } },
    });

    for (const row of returnRows) {
      await adjustStock(db, {
        productId: row.productId,
        quantity: row.quantity.negated(),
        type: MovementType.PURCHASE_RETURN,
        unitCost: row.unitCost,
        referenceType: 'PURCHASE_RETURN',
        referenceId: purchaseReturn.id,
        reason: `Purchase return for ${purchase.purchaseNumber}: ${input.reason}`,
        date: returnDate,
      });
    }

    await db.supplier.update({
      where: { id: purchase.supplierId },
      data: {
        balance: { decrement: returnTotal },
      },
    });

    return purchaseReturn;
  });
}
