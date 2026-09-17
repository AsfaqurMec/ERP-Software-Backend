import { Prisma } from '@prisma/client';
import { ConflictError, NotFoundError } from '../../lib/errors.js';
import * as categoryRepo from './category.repository.js';
import type { CreateCategoryInput, UpdateCategoryInput } from './category.validation.js';
import { ensureImageUrl } from '../upload/upload.service.js';

function computeCategoryMetrics(category: any) {
  let totalPurchases = new Prisma.Decimal(0);
  let totalSales = new Prisma.Decimal(0);
  let totalCogs = new Prisma.Decimal(0);

  for (const product of category.products || []) {
    for (const item of product.purchaseItems || []) {
      if (item.purchase?.status === 'CONFIRMED') {
        totalPurchases = totalPurchases.add(item.total);
      }
    }
    for (const item of product.saleItems || []) {
      if (item.sale?.status === 'CONFIRMED') {
        totalSales = totalSales.add(item.total);
        totalCogs = totalCogs.add(item.unitCost.mul(item.quantity));
      }
    }
  }

  const profit = totalSales.sub(totalCogs);

  return {
    id: category.id,
    name: category.name,
    description: category.description,
    image: category.image,
    status: category.status,
    createdAt: category.createdAt,
    updatedAt: category.updatedAt,
    metrics: {
      productCount: category.products?.length || 0,
      purchases: totalPurchases,
      sales: totalSales,
      profit,
    },
  };
}

export async function getCategories() {
  const categories = await categoryRepo.findMany();
  return categories.map(computeCategoryMetrics);
}

export async function getCategoryById(id: string) {
  const category = await categoryRepo.findById(id);
  if (!category) {
    throw new NotFoundError('Category');
  }
  return computeCategoryMetrics(category);
}

export async function createCategory(input: CreateCategoryInput) {
  const existing = await categoryRepo.findByName(input.name);
  if (existing) {
    throw new ConflictError(`Category "${input.name}" already exists.`);
  }

  const imageUrl = await ensureImageUrl(input.image, 'stockpilot/categories');

  return categoryRepo.create({
    name: input.name,
    description: input.description || null,
    image: imageUrl || null,
    status: input.status,
  });
}

export async function updateCategory(id: string, input: UpdateCategoryInput) {
  const existing = await categoryRepo.findById(id);
  if (!existing) {
    throw new NotFoundError('Category');
  }

  if (input.name && input.name !== existing.name) {
    const duplicate = await categoryRepo.findByName(input.name);
    if (duplicate) {
      throw new ConflictError(`Category "${input.name}" already exists.`);
    }
  }

  const imageUrl = input.image !== undefined ? await ensureImageUrl(input.image, 'stockpilot/categories') : undefined;

  return categoryRepo.update(id, {
    name: input.name,
    description: input.description !== undefined ? input.description : undefined,
    image: imageUrl !== undefined ? imageUrl || null : undefined,
    status: input.status,
  });
}
