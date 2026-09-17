import { MovementType, Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { BusinessError, NotFoundError } from '../../lib/errors.js';
import { recordActivity } from '../audit/audit.service.js';
import { buildPaginatedResult, type PaginatedResult } from '../../lib/pagination.js';
import * as inventoryRepo from './inventory.repository.js';
import type { AdjustmentInput, MovementsQueryInput } from './inventory.validation.js';

export interface AdjustStockParams {
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

export async function adjustStock(db: any, params: AdjustStockParams) {
  const product = await db.product.findUnique({ where: { id: params.productId } });
  if (!product) {
    throw new NotFoundError('Product');
  }

  const nextStock = product.stock.add(params.quantity);
  if (nextStock.lessThan(0)) {
    throw new BusinessError(
      `Insufficient stock for "${product.name}". Available: ${product.stock.toString()}; Required deduction: ${params.quantity.abs().toString()}`
    );
  }

  let nextAverageCost = product.averageCost;
  if (params.quantity.greaterThan(0) && params.unitCost && params.unitCost.greaterThan(0)) {
    const currentVal = product.stock.greaterThan(0) ? product.stock.mul(product.averageCost) : new Prisma.Decimal(0);
    const addedVal = params.quantity.mul(params.unitCost);
    const totalQty = (product.stock.greaterThan(0) ? product.stock : new Prisma.Decimal(0)).add(params.quantity);
    if (totalQty.greaterThan(0)) {
      nextAverageCost = currentVal.add(addedVal).div(totalQty);
    }
  }

  await db.product.update({
    where: { id: product.id },
    data: {
      stock: nextStock,
      averageCost: nextAverageCost,
    },
  });

  return db.stockMovement.create({
    data: {
      productId: product.id,
      type: params.type,
      quantity: params.quantity,
      unitCost: params.unitCost || product.averageCost,
      referenceType: params.referenceType || null,
      referenceId: params.referenceId || null,
      reason: params.reason || null,
      note: params.note || null,
      movementDate: params.date || new Date(),
    },
  });
}

export async function getStockMovements(query: MovementsQueryInput): Promise<PaginatedResult<any>> {
  const result = await inventoryRepo.findMovementsPaginated(query);
  return buildPaginatedResult(result.data, result.total, result.page, result.limit);
}

export async function getInventoryOverview() {
  const products = await inventoryRepo.getAllProducts();

  let totalStock = new Prisma.Decimal(0);
  let stockValue = new Prisma.Decimal(0);
  let lowStock = 0;
  let outOfStock = 0;
  let overstocked = 0;

  for (const p of products) {
    totalStock = totalStock.add(p.stock);
    stockValue = stockValue.add(p.stock.mul(p.averageCost));

    if (p.stock.lessThanOrEqualTo(0)) {
      outOfStock++;
    } else if (p.stock.lessThanOrEqualTo(p.minimumStock)) {
      lowStock++;
    } else if (p.maximumStock && p.stock.greaterThanOrEqualTo(p.maximumStock)) {
      overstocked++;
    }
  }

  return {
    totalStock,
    stockValue,
    lowStock,
    outOfStock,
    overstocked,
  };
}

export async function applyManualAdjustment(input: AdjustmentInput) {
  const result = await prisma.$transaction(async (db) => {
    const qty = new Prisma.Decimal(input.quantity);
    const effectiveQty = input.type === 'OUT' ? qty.negated() : qty;
    const movementType = input.type === 'IN' ? MovementType.ADJUSTMENT_IN : MovementType.ADJUSTMENT_OUT;

    return adjustStock(db, {
      productId: input.productId,
      quantity: effectiveQty,
      type: movementType,
      unitCost: input.unitCost !== undefined ? new Prisma.Decimal(input.unitCost) : undefined,
      reason: input.reason,
      note: input.note,
      date: input.date ? new Date(input.date) : undefined,
      referenceType: 'MANUAL_ADJUSTMENT',
    });
  });

  await recordActivity({
    action: 'UPDATE',
    module: 'INVENTORY',
    reference: `Manual Adjustment ${input.type} for Product ${input.productId}`,
    details: { productId: input.productId, quantity: input.quantity, type: input.type, reason: input.reason },
  });

  return result;
}
