import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import type { ProductQueryInput } from './product.validation.js';

export async function findManyPaginated(query: ProductQueryInput) {
  const { page, limit, search, categoryId, status, stockStatus, sortBy, sortOrder } = query;

  const where: Prisma.ProductWhereInput = {};

  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { sku: { contains: search, mode: 'insensitive' } },
      { barcode: { contains: search, mode: 'insensitive' } },
      { brand: { contains: search, mode: 'insensitive' } },
    ];
  }

  if (categoryId) {
    where.categoryId = categoryId;
  }

  if (status) {
    where.status = status;
  }

  if (stockStatus) {
    if (stockStatus === 'in_stock') {
      where.stock = { gt: 0 };
    } else if (stockStatus === 'out_of_stock') {
      where.stock = { lte: 0 };
    } else if (stockStatus === 'low_stock') {
      where.AND = [
        { stock: { gt: 0 } },
        { stock: { lte: prisma.product.fields.minimumStock } },
      ];
    }
  }

  const orderByField = sortBy || 'createdAt';
  const orderBy: Prisma.ProductOrderByWithRelationInput = {
    [orderByField]: sortOrder || 'desc',
  };

  const [data, total] = await Promise.all([
    prisma.product.findMany({
      where,
      include: {
        category: { select: { id: true, name: true } },
        supplier: { select: { id: true, name: true, company: true } },
      },
      skip: (page - 1) * limit,
      take: limit,
      orderBy,
    }),
    prisma.product.count({ where }),
  ]);

  return { data, total, page, limit };
}

export async function findById(id: string) {
  return prisma.product.findUnique({
    where: { id },
    include: {
      category: true,
      supplier: true,
      movements: {
        take: 15,
        orderBy: { movementDate: 'desc' },
      },
      purchaseItems: {
        include: { purchase: true },
      },
      saleItems: {
        include: { sale: true },
      },
    },
  });
}

export async function findBySku(sku: string) {
  return prisma.product.findUnique({ where: { sku } });
}

export async function findByBarcode(barcode: string) {
  return prisma.product.findUnique({ where: { barcode } });
}

export async function create(data: Prisma.ProductCreateInput, db: any = prisma) {
  return db.product.create({ data, include: { category: true, supplier: true } });
}

export async function update(id: string, data: Prisma.ProductUpdateInput, db: any = prisma) {
  return db.product.update({ where: { id }, data, include: { category: true, supplier: true } });
}
