import { MovementType, Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { BusinessError, NotFoundError } from '../../lib/errors.js';
import { buildPaginatedResult, type PaginatedResult } from '../../lib/pagination.js';
import type { CreateProductInput, ProductQueryInput, UpdateProductInput } from './dto.js';

export async function getProducts(query: ProductQueryInput): Promise<PaginatedResult<any>> {
  const { page, limit, search, categoryId, supplierId, status, stockStatus, sortBy, sortOrder } = query;

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

  if (supplierId) {
    where.supplierId = supplierId;
  }

  if (status) {
    where.status = status;
  }

  if (stockStatus === 'in_stock') {
    where.stock = { gt: 0 };
  } else if (stockStatus === 'out_of_stock') {
    where.stock = { lte: 0 };
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
        supplier: { select: { id: true, name: true } },
      },
      skip: (page - 1) * limit,
      take: limit,
      orderBy,
    }),
    prisma.product.count({ where }),
  ]);

  let filteredData = data;
  if (stockStatus === 'low_stock') {
    filteredData = data.filter((p: any) => new Prisma.Decimal(p.stock).gt(0) && new Prisma.Decimal(p.stock).lte(p.minimumStock));
  } else if (stockStatus === 'overstocked') {
    filteredData = data.filter((p: any) => p.maximumStock && new Prisma.Decimal(p.stock).gt(p.maximumStock));
  }

  return buildPaginatedResult(filteredData, total, page, limit);
}

export async function getProductById(id: string) {
  const product = await prisma.product.findUnique({
    where: { id },
    include: {
      category: true,
      supplier: true,
      movements: {
        orderBy: { movementDate: 'desc' },
        take: 20,
      },
      saleItems: {
        include: { sale: { select: { invoiceNumber: true, saleDate: true, status: true } } },
      },
      purchaseItems: {
        include: { purchase: { select: { purchaseNumber: true, purchaseDate: true, status: true } } },
      },
    },
  });

  if (!product) {
    throw new NotFoundError('Product');
  }

  const confirmedSales = (product.saleItems as any[]).filter((si: any) => si.sale.status === 'CONFIRMED');
  const confirmedPurchases = (product.purchaseItems as any[]).filter((pi: any) => pi.purchase.status === 'CONFIRMED');

  const sum = (items: any[], field: string) =>
    items.reduce((acc, item) => acc.add(item[field] || 0), new Prisma.Decimal(0));

  const totalSold = sum(confirmedSales, 'quantity');
  const revenue = sum(confirmedSales, 'total');
  const totalPurchased = sum(confirmedPurchases, 'quantity');
  const totalCost = confirmedSales.reduce(
    (acc: any, si: any) => acc.add(new Prisma.Decimal(si.unitCost).mul(si.quantity)),
    new Prisma.Decimal(0)
  );
  const estimatedProfit = revenue.sub(totalCost);
  const stockValue = product.stock.mul(product.averageCost);

  return {
    ...product,
    summary: {
      totalPurchased,
      totalSold,
      currentStock: product.stock,
      revenue,
      estimatedProfit,
      stockValue,
      averagePurchaseCost: product.averageCost,
    },
  };
}

export async function createProduct(input: CreateProductInput) {
  const existingSku = await prisma.product.findUnique({ where: { sku: input.sku } });
  if (existingSku) {
    throw new BusinessError(`A product with SKU "${input.sku}" already exists.`);
  }

  if (input.barcode) {
    const existingBarcode = await prisma.product.findUnique({ where: { barcode: input.barcode } });
    if (existingBarcode) {
      throw new BusinessError(`A product with barcode "${input.barcode}" already exists.`);
    }
  }

  const openingStock = new Prisma.Decimal(input.openingStock || 0);
  const purchasePrice = new Prisma.Decimal(input.purchasePrice);

  return prisma.$transaction(async (db: any) => {
    const product = await db.product.create({
      data: {
        sku: input.sku,
        barcode: input.barcode || null,
        name: input.name,
        categoryId: input.categoryId,
        supplierId: input.supplierId || null,
        brand: input.brand || null,
        description: input.description || null,
        image: input.image || null,
        unit: input.unit || 'pcs',
        purchasePrice,
        sellingPrice: new Prisma.Decimal(input.sellingPrice),
        wholesalePrice: input.wholesalePrice !== undefined ? new Prisma.Decimal(input.wholesalePrice) : null,
        stock: openingStock,
        averageCost: purchasePrice,
        minimumStock: new Prisma.Decimal(input.minimumStock || 0),
        maximumStock: input.maximumStock !== undefined ? new Prisma.Decimal(input.maximumStock) : null,
        status: input.status,
      },
      include: {
        category: true,
        supplier: true,
      },
    });

    if (openingStock.gt(0)) {
      await db.stockMovement.create({
        data: {
          productId: product.id,
          type: MovementType.OPENING_STOCK,
          quantity: openingStock,
          unitCost: purchasePrice,
          referenceType: 'OPENING_STOCK',
          referenceId: product.id,
          reason: 'Initial Opening Stock',
          note: 'Created during product setup',
          movementDate: new Date(),
        },
      });
    }

    return product;
  });
}

export async function updateProduct(id: string, input: UpdateProductInput) {
  const product = await prisma.product.findUnique({ where: { id } });
  if (!product) {
    throw new NotFoundError('Product');
  }

  if (input.sku && input.sku !== product.sku) {
    const existingSku = await prisma.product.findUnique({ where: { sku: input.sku } });
    if (existingSku) {
      throw new BusinessError(`SKU "${input.sku}" is already in use by another product.`);
    }
  }

  if (input.barcode && input.barcode !== product.barcode) {
    const existingBarcode = await prisma.product.findUnique({ where: { barcode: input.barcode } });
    if (existingBarcode) {
      throw new BusinessError(`Barcode "${input.barcode}" is already in use.`);
    }
  }

  return prisma.product.update({
    where: { id },
    data: {
      ...(input.sku !== undefined ? { sku: input.sku } : {}),
      ...(input.barcode !== undefined ? { barcode: input.barcode || null } : {}),
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.categoryId !== undefined ? { categoryId: input.categoryId } : {}),
      ...(input.supplierId !== undefined ? { supplierId: input.supplierId || null } : {}),
      ...(input.brand !== undefined ? { brand: input.brand || null } : {}),
      ...(input.description !== undefined ? { description: input.description || null } : {}),
      ...(input.image !== undefined ? { image: input.image || null } : {}),
      ...(input.unit !== undefined ? { unit: input.unit } : {}),
      ...(input.purchasePrice !== undefined ? { purchasePrice: new Prisma.Decimal(input.purchasePrice) } : {}),
      ...(input.sellingPrice !== undefined ? { sellingPrice: new Prisma.Decimal(input.sellingPrice) } : {}),
      ...(input.wholesalePrice !== undefined
        ? { wholesalePrice: input.wholesalePrice !== null ? new Prisma.Decimal(input.wholesalePrice) : null }
        : {}),
      ...(input.minimumStock !== undefined ? { minimumStock: new Prisma.Decimal(input.minimumStock) } : {}),
      ...(input.maximumStock !== undefined
        ? { maximumStock: input.maximumStock !== null ? new Prisma.Decimal(input.maximumStock) : null }
        : {}),
      ...(input.status !== undefined ? { status: input.status } : {}),
    },
    include: {
      category: true,
      supplier: true,
    },
  });
}
