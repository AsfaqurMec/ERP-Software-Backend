import { MovementType, Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { BusinessError, NotFoundError } from '../../lib/errors.js';
import type { AdjustmentInput, MovementsQueryInput } from './dto.js';
import { buildPaginatedResult } from '../../lib/pagination.js';

type DbClient = Prisma.TransactionClient;

export interface StockAdjustmentParams {
  productId: string;
  quantity: Prisma.Decimal;
  type: MovementType;
  unitCost?: Prisma.Decimal;
  referenceType?: string;
  referenceId?: string;
  reason?: string;
  note?: string;
  date?: Date;
}

export async function adjustStock(db: any, params: StockAdjustmentParams) {
  const product = await db.product.findUnique({ where: { id: params.productId } });
  if (!product) {
    throw new NotFoundError('Product');
  }

  const nextStock = product.stock.add(params.quantity);
  if (nextStock.lessThan(0)) {
    throw new BusinessError(
      `Insufficient stock for "${product.name}". Available: ${product.stock.toString()}; Requested adjustment: ${params.quantity.toString()}`
    );
  }

  let averageCost = product.averageCost;
  const isIncoming =
    params.type === MovementType.PURCHASE ||
    params.type === MovementType.OPENING_STOCK ||
    params.type === MovementType.ADJUSTMENT_IN;

  if (isIncoming) {
    const cost = params.unitCost ?? product.averageCost;
    if (nextStock.eq(0)) {
      averageCost = new Prisma.Decimal(0);
    } else {
      const currentValue = product.stock.mul(product.averageCost);
      const incomingValue = params.quantity.mul(cost);
      averageCost = currentValue.add(incomingValue).div(nextStock);
    }
  }

  const updatedProduct = await db.product.update({
    where: { id: product.id },
    data: {
      stock: nextStock,
      averageCost,
    },
  });

  const movement = await db.stockMovement.create({
    data: {
      productId: product.id,
      type: params.type,
      quantity: params.quantity,
      unitCost: params.unitCost ?? (isIncoming ? params.unitCost : product.averageCost),
      referenceType: params.referenceType,
      referenceId: params.referenceId,
      reason: params.reason,
      note: params.note,
      movementDate: params.date || new Date(),
    },
  });

  return { product: updatedProduct, movement };
}

export async function getInventoryOverview() {
  const products = await prisma.product.findMany({
    select: {
      stock: true,
      averageCost: true,
      minimumStock: true,
      maximumStock: true,
    },
  });

  const totalStock = products.reduce((acc, p) => acc.add(p.stock), new Prisma.Decimal(0));
  const stockValue = products.reduce((acc, p) => acc.add(p.stock.mul(p.averageCost)), new Prisma.Decimal(0));
  const lowStock = products.filter(
    (p) => new Prisma.Decimal(p.stock).gt(0) && new Prisma.Decimal(p.stock).lte(p.minimumStock)
  ).length;
  const outOfStock = products.filter((p) => new Prisma.Decimal(p.stock).lte(0)).length;
  const overstocked = products.filter(
    (p) => p.maximumStock && new Prisma.Decimal(p.stock).gt(p.maximumStock)
  ).length;

  return {
    totalStock,
    stockValue,
    lowStock,
    outOfStock,
    overstocked,
  };
}

export async function getStockMovements(query: MovementsQueryInput) {
  const { productId, type, page, limit } = query;
  const where: Prisma.StockMovementWhereInput = {};

  if (productId) {
    where.productId = productId;
  }
  if (type) {
    where.type = type;
  }

  const [data, total] = await Promise.all([
    prisma.stockMovement.findMany({
      where,
      include: {
        product: { select: { id: true, name: true, sku: true } },
      },
      orderBy: { movementDate: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.stockMovement.count({ where }),
  ]);

  return buildPaginatedResult(data, total, page, limit);
}

export async function applyManualAdjustment(input: AdjustmentInput) {
  const quantityDecimal = new Prisma.Decimal(input.quantity);
  const adjustedQty = input.type === 'IN' ? quantityDecimal : quantityDecimal.negated();
  const movementType = input.type === 'IN' ? MovementType.ADJUSTMENT_IN : MovementType.ADJUSTMENT_OUT;

  return prisma.$transaction(async (db) => {
    const result = await adjustStock(db, {
      productId: input.productId,
      quantity: adjustedQty,
      type: movementType,
      unitCost: input.unitCost !== undefined ? new Prisma.Decimal(input.unitCost) : undefined,
      referenceType: 'MANUAL_ADJUSTMENT',
      reason: input.reason,
      note: input.note,
      date: input.date || new Date(),
    });

    return result.movement;
  });
}
