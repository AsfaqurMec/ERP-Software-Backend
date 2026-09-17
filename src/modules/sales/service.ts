import { DocumentStatus, MovementType, PartyType, PaymentMethod, PaymentStatus, Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { BusinessError, NotFoundError } from '../../lib/errors.js';
import { adjustStock } from '../inventory/service.js';
import { buildPaginatedResult, type PaginatedResult } from '../../lib/pagination.js';
import type { CreateSaleInput, SaleQueryInput, SalesReturnInput } from './dto.js';

function computePaymentStatus(grandTotal: Prisma.Decimal, paidAmount: Prisma.Decimal): PaymentStatus {
  if (paidAmount.greaterThanOrEqualTo(grandTotal)) return PaymentStatus.PAID;
  if (paidAmount.greaterThan(0)) return PaymentStatus.PARTIAL;
  return PaymentStatus.UNPAID;
}

export async function getSales(query: SaleQueryInput): Promise<PaginatedResult<any>> {
  const { page, limit, search, customerId, status, paymentStatus, sortBy, sortOrder } = query;

  const where: Prisma.SaleWhereInput = {};

  if (search) {
    where.OR = [
      { invoiceNumber: { contains: search, mode: 'insensitive' } },
      { customer: { name: { contains: search, mode: 'insensitive' } } },
    ];
  }

  if (customerId) {
    where.customerId = customerId;
  }
  if (status) {
    where.status = status;
  }
  if (paymentStatus) {
    where.paymentStatus = paymentStatus;
  }

  const orderByField = sortBy || 'saleDate';
  const orderBy: Prisma.SaleOrderByWithRelationInput = {
    [orderByField]: sortOrder || 'desc',
  };

  const [data, total] = await Promise.all([
    prisma.sale.findMany({
      where,
      include: {
        customer: { select: { id: true, name: true, phone: true } },
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
    prisma.sale.count({ where }),
  ]);

  return buildPaginatedResult(data, total, page, limit);
}

export async function getSaleById(id: string) {
  const sale = await prisma.sale.findUnique({
    where: { id },
    include: {
      customer: true,
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

  if (!sale) {
    throw new NotFoundError('Sale');
  }

  const grossProfit = sale.grandTotal.sub(sale.cogs);

  return {
    ...sale,
    grossProfit,
  };
}

export async function createSale(input: CreateSaleInput) {
  const customerId = input.customerId || null;
  if (customerId) {
    const customer = await prisma.customer.findUnique({ where: { id: customerId } });
    if (!customer) {
      throw new NotFoundError('Customer');
    }
  }

  const discount = new Prisma.Decimal(input.discount || 0);
  const tax = new Prisma.Decimal(input.tax || 0);
  const shipping = new Prisma.Decimal(input.shipping || 0);
  const paidAmount = new Prisma.Decimal(input.paidAmount || 0);

  const calculatedItems = input.items.map((item) => {
    const unitPrice = new Prisma.Decimal(item.unitPrice);
    const quantity = new Prisma.Decimal(item.quantity);
    const itemDiscount = new Prisma.Decimal(item.discount || 0);
    const itemTax = new Prisma.Decimal(item.tax || 0);
    const subtotal = unitPrice.mul(quantity);
    const total = subtotal.sub(itemDiscount).add(itemTax);

    return {
      productId: item.productId,
      quantity,
      unitPrice,
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
  const saleDate = new Date(input.saleDate);

  return prisma.$transaction(async (db: any) => {
    let totalCogs = new Prisma.Decimal(0);
    const itemCosts = new Map<string, Prisma.Decimal>();

    if (isConfirmed) {
      for (const item of calculatedItems) {
        const product = await db.product.findUnique({ where: { id: item.productId } });
        if (!product) {
          throw new NotFoundError('Product');
        }

        if (product.stock.lessThan(item.quantity)) {
          throw new BusinessError(
            `Insufficient stock for "${product.name}". Available: ${product.stock.toString()}; Requested: ${item.quantity.toString()}`
          );
        }

        itemCosts.set(item.productId, product.averageCost);
        totalCogs = totalCogs.add(product.averageCost.mul(item.quantity));
      }
    }

    const count = await db.sale.count();
    const invoiceNumber = input.invoiceNumber || `SAL-${String(count + 1).padStart(6, '0')}`;

    const sale = await db.sale.create({
      data: {
        invoiceNumber,
        customerId,
        saleDate,
        status: isConfirmed ? DocumentStatus.CONFIRMED : DocumentStatus.DRAFT,
        paymentStatus: computePaymentStatus(grandTotal, paidAmount),
        subtotal,
        discount,
        tax,
        shipping,
        grandTotal,
        paidAmount,
        dueAmount,
        cogs: totalCogs,
        paymentMethod: input.paymentMethod || null,
        notes: input.notes || null,
        items: {
          create: calculatedItems.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            unitCost: itemCosts.get(item.productId) || new Prisma.Decimal(0),
            discount: item.discount,
            tax: item.tax,
            subtotal: item.subtotal,
            total: item.total,
          })),
        },
      },
      include: {
        customer: true,
        items: {
          include: { product: true },
        },
      },
    });

    if (isConfirmed) {
      for (const item of calculatedItems) {
        const unitCost = itemCosts.get(item.productId);
        await adjustStock(db, {
          productId: item.productId,
          quantity: item.quantity.negated(),
          type: MovementType.SALE,
          unitCost,
          referenceType: 'SALE',
          referenceId: sale.id,
          reason: `Customer invoice ${sale.invoiceNumber}`,
          date: saleDate,
        });
      }

      if (customerId) {
        await db.customer.update({
          where: { id: customerId },
          data: {
            balance: { increment: dueAmount },
          },
        });

        if (paidAmount.gt(0)) {
          await db.payment.create({
            data: {
              partyType: PartyType.CUSTOMER,
              partyId: customerId,
              customerId,
              saleId: sale.id,
              amount: paidAmount,
              date: saleDate,
              method: input.paymentMethod || PaymentMethod.CASH,
              reference: sale.invoiceNumber,
              note: `Initial payment for invoice ${sale.invoiceNumber}`,
            },
          });
        }
      }
    }

    return sale;
  });
}

export async function cancelDraftSale(id: string) {
  const sale = await prisma.sale.findUnique({ where: { id } });
  if (!sale) {
    throw new NotFoundError('Sale');
  }

  if (sale.status !== DocumentStatus.DRAFT) {
    throw new BusinessError('Only draft sales can be cancelled. Confirmed sales must use a sales return.');
  }

  return prisma.sale.update({
    where: { id },
    data: { status: DocumentStatus.CANCELLED },
  });
}

export async function getSalesReturns(query?: { page?: number; limit?: number; search?: string }) {
  const page = query?.page || 1;
  const limit = query?.limit || 20;

  const [data, total] = await Promise.all([
    prisma.salesReturn.findMany({
      include: {
        sale: {
          include: {
            customer: { select: { id: true, name: true, phone: true } },
          },
        },
        items: true,
      },
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { date: 'desc' },
    }),
    prisma.salesReturn.count(),
  ]);

  return buildPaginatedResult(data, total, page, limit);
}

export async function getSalesReturnById(id: string) {
  const salesReturn = await prisma.salesReturn.findUnique({
    where: { id },
    include: {
      sale: {
        include: {
          customer: true,
          items: { include: { product: true } },
        },
      },
      items: true,
    },
  });

  if (!salesReturn) {
    throw new NotFoundError('Sales Return');
  }

  return salesReturn;
}

export async function createSalesReturn(input: SalesReturnInput) {
  return prisma.$transaction(async (db: any) => {
    const sale = await db.sale.findUnique({
      where: { id: input.saleId },
      include: { items: true },
    });

    if (!sale) {
      throw new NotFoundError('Sale');
    }

    if (sale.status !== DocumentStatus.CONFIRMED) {
      throw new BusinessError('Only confirmed sales can be returned.');
    }

    let returnTotal = new Prisma.Decimal(0);
    let returnCogs = new Prisma.Decimal(0);
    const returnRows: {
      saleItemId: string;
      productId: string;
      quantity: Prisma.Decimal;
      total: Prisma.Decimal;
      unitCost: Prisma.Decimal;
    }[] = [];

    for (const reqItem of input.items) {
      const item = (sale.items as any[]).find((i: any) => i.id === reqItem.saleItemId);
      if (!item) {
        throw new BusinessError('Return item does not belong to this sale.');
      }

      const prevReturns = await db.salesReturnItem.aggregate({
        where: { saleItemId: item.id },
        _sum: { quantity: true },
      });

      const alreadyReturned = prevReturns._sum.quantity || new Prisma.Decimal(0);
      const returnQty = new Prisma.Decimal(reqItem.quantity);

      if (alreadyReturned.add(returnQty).greaterThan(item.quantity)) {
        throw new BusinessError(`Return quantity (${returnQty}) exceeds the original sold quantity (${item.quantity}).`);
      }

      const lineTotal = item.total.div(item.quantity).mul(returnQty);
      returnRows.push({
        saleItemId: item.id,
        productId: item.productId,
        quantity: returnQty,
        total: lineTotal,
        unitCost: item.unitCost,
      });

      returnTotal = returnTotal.add(lineTotal);
      returnCogs = returnCogs.add(item.unitCost.mul(returnQty));
    }

    const returnDate = new Date(input.date);
    const salesReturn = await db.salesReturn.create({
      data: {
        saleId: sale.id,
        date: returnDate,
        reason: input.reason,
        note: input.note || null,
        total: returnTotal,
        cogs: returnCogs,
        items: {
          create: returnRows.map((r) => ({
            saleItemId: r.saleItemId,
            productId: r.productId,
            quantity: r.quantity,
            total: r.total,
          })),
        },
      },
      include: { items: true, sale: { include: { customer: true } } },
    });

    for (const row of returnRows) {
      await adjustStock(db, {
        productId: row.productId,
        quantity: row.quantity,
        type: MovementType.SALES_RETURN,
        unitCost: row.unitCost,
        referenceType: 'SALES_RETURN',
        referenceId: salesReturn.id,
        reason: `Sales return for invoice ${sale.invoiceNumber}: ${input.reason}`,
        date: returnDate,
      });
    }

    if (sale.customerId) {
      await db.customer.update({
        where: { id: sale.customerId },
        data: {
          balance: { decrement: returnTotal },
        },
      });
    }

    return salesReturn;
  });
}
