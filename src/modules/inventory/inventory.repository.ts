import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import type { MovementsQueryInput } from './inventory.validation.js';

export async function findMovementsPaginated(query: MovementsQueryInput) {
  const { page, limit, productId, type } = query;

  const where: Prisma.StockMovementWhereInput = {};
  if (productId) where.productId = productId;
  if (type) where.type = type;

  const [data, total] = await Promise.all([
    prisma.stockMovement.findMany({
      where,
      include: {
        product: { select: { id: true, name: true, sku: true, unit: true } },
      },
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { movementDate: 'desc' },
    }),
    prisma.stockMovement.count({ where }),
  ]);

  return { data, total, page, limit };
}

export async function getAllProducts() {
  return prisma.product.findMany({
    select: {
      id: true,
      stock: true,
      averageCost: true,
      minimumStock: true,
      maximumStock: true,
    },
  });
}
