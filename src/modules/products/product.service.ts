import { MovementType, Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { ConflictError, NotFoundError } from '../../lib/errors.js';
import { buildPaginatedResult, type PaginatedResult } from '../../lib/pagination.js';
import * as productRepo from './product.repository.js';
import { mapProductToSummary } from './product.mapper.js';
import type { CreateProductInput, ProductQueryInput, UpdateProductInput } from './product.validation.js';
import type { ProductWithSummary } from './product.types.js';
import { ensureImageUrl } from '../upload/upload.service.js';

export async function getProducts(query: ProductQueryInput): Promise<PaginatedResult<any>> {
  const result = await productRepo.findManyPaginated(query);
  return buildPaginatedResult(result.data, result.total, result.page, result.limit);
}

export async function getProductById(id: string): Promise<ProductWithSummary> {
  const product = await productRepo.findById(id);
  if (!product) {
    throw new NotFoundError('Product');
  }
  return mapProductToSummary(product);
}

export async function createProduct(input: CreateProductInput) {
  const existingSku = await productRepo.findBySku(input.sku);
  if (existingSku) {
    throw new ConflictError(`Product SKU "${input.sku}" is already in use.`);
  }

  if (input.barcode) {
    const existingBarcode = await productRepo.findByBarcode(input.barcode);
    if (existingBarcode) {
      throw new ConflictError(`Barcode "${input.barcode}" is already assigned to another product.`);
    }
  }

  const category = await prisma.category.findUnique({ where: { id: input.categoryId } });
  if (!category) {
    throw new NotFoundError('Category');
  }

  const imageUrl = await ensureImageUrl(input.image, 'stockpilot/products');

  const openingStock = new Prisma.Decimal(input.openingStock || 0);
  const purchasePrice = new Prisma.Decimal(input.purchasePrice);
  const sellingPrice = new Prisma.Decimal(input.sellingPrice);
  const wholesalePrice = input.wholesalePrice !== undefined && input.wholesalePrice !== null
    ? new Prisma.Decimal(input.wholesalePrice)
    : null;
  const minimumStock = new Prisma.Decimal(input.minimumStock || 0);
  const maximumStock = input.maximumStock !== undefined && input.maximumStock !== null
    ? new Prisma.Decimal(input.maximumStock)
    : null;

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
        image: imageUrl || null,
        unit: input.unit || 'pcs',
        purchasePrice,
        sellingPrice,
        wholesalePrice,
        stock: openingStock,
        averageCost: purchasePrice,
        minimumStock,
        maximumStock,
        status: input.status,
      },
      include: { category: true, supplier: true },
    });

    if (openingStock.gt(0)) {
      await db.stockMovement.create({
        data: {
          productId: product.id,
          type: MovementType.OPENING_STOCK,
          quantity: openingStock,
          unitCost: purchasePrice,
          reason: 'Initial opening stock allocation',
          referenceType: 'OPENING_STOCK',
        },
      });
    }

    return product;
  });
}

export async function updateProduct(id: string, input: UpdateProductInput) {
  const existing = await productRepo.findById(id);
  if (!existing) {
    throw new NotFoundError('Product');
  }

  if (input.sku && input.sku !== existing.sku) {
    const duplicate = await productRepo.findBySku(input.sku);
    if (duplicate) {
      throw new ConflictError(`Product SKU "${input.sku}" is already in use.`);
    }
  }

  const updateData: Prisma.ProductUpdateInput = {};

  if (input.name !== undefined) updateData.name = input.name;
  if (input.sku !== undefined) updateData.sku = input.sku;
  if (input.barcode !== undefined) updateData.barcode = input.barcode;
  if (input.brand !== undefined) updateData.brand = input.brand;
  if (input.description !== undefined) updateData.description = input.description;
  if (input.image !== undefined) {
    const imageUrl = await ensureImageUrl(input.image, 'stockpilot/products');
    updateData.image = imageUrl || null;
  }
  if (input.unit !== undefined) updateData.unit = input.unit;
  if (input.status !== undefined) updateData.status = input.status;

  if (input.purchasePrice !== undefined) updateData.purchasePrice = new Prisma.Decimal(input.purchasePrice);
  if (input.sellingPrice !== undefined) updateData.sellingPrice = new Prisma.Decimal(input.sellingPrice);
  if (input.wholesalePrice !== undefined) {
    updateData.wholesalePrice = input.wholesalePrice !== null ? new Prisma.Decimal(input.wholesalePrice) : null;
  }
  if (input.minimumStock !== undefined) updateData.minimumStock = new Prisma.Decimal(input.minimumStock);
  if (input.maximumStock !== undefined) {
    updateData.maximumStock = input.maximumStock !== null ? new Prisma.Decimal(input.maximumStock) : null;
  }

  if (input.categoryId) {
    updateData.category = { connect: { id: input.categoryId } };
  }
  if (input.supplierId !== undefined) {
    updateData.supplier = input.supplierId ? { connect: { id: input.supplierId } } : { disconnect: true };
  }

  return productRepo.update(id, updateData);
}
