import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { NotFoundError } from '../../lib/errors.js';
import type { CreateCategoryInput, UpdateCategoryInput } from './dto.js';

export async function getAllCategories() {
  const categories = await prisma.category.findMany({
    include: {
      products: {
        include: {
          saleItems: true,
          purchaseItems: true,
        },
      },
    },
    orderBy: { name: 'asc' },
  });

  const sum = (items: { [key: string]: any }[], field: string) =>
    items.reduce((acc, item) => acc.add(item[field] || 0), new Prisma.Decimal(0));

  return categories.map((cat) => {
    const saleItems = cat.products.flatMap((p) => p.saleItems);
    const purchaseItems = cat.products.flatMap((p) => p.purchaseItems);

    const sales = sum(saleItems, 'total');
    const purchases = sum(purchaseItems, 'total');
    const cogs = saleItems.reduce(
      (acc, item) => acc.add(new Prisma.Decimal(item.unitCost).mul(item.quantity)),
      new Prisma.Decimal(0)
    );
    const profit = sales.sub(cogs);

    return {
      id: cat.id,
      name: cat.name,
      description: cat.description,
      image: cat.image,
      status: cat.status,
      createdAt: cat.createdAt,
      updatedAt: cat.updatedAt,
      metrics: {
        productCount: cat.products.length,
        sales,
        purchases,
        profit,
      },
    };
  });
}

export async function getCategoryById(id: string) {
  const cat = await prisma.category.findUnique({
    where: { id },
    include: {
      products: {
        include: {
          saleItems: true,
          purchaseItems: true,
        },
      },
    },
  });

  if (!cat) {
    throw new NotFoundError('Category');
  }

  const saleItems = cat.products.flatMap((p) => p.saleItems);
  const purchaseItems = cat.products.flatMap((p) => p.purchaseItems);
  const sales = saleItems.reduce((acc, item) => acc.add(item.total), new Prisma.Decimal(0));
  const purchases = purchaseItems.reduce((acc, item) => acc.add(item.total), new Prisma.Decimal(0));
  const cogs = saleItems.reduce(
    (acc, item) => acc.add(new Prisma.Decimal(item.unitCost).mul(item.quantity)),
    new Prisma.Decimal(0)
  );

  return {
    ...cat,
    metrics: {
      productCount: cat.products.length,
      sales,
      purchases,
      profit: sales.sub(cogs),
    },
  };
}

export async function createCategory(input: CreateCategoryInput) {
  return prisma.category.create({
    data: {
      name: input.name,
      description: input.description,
      image: input.image || null,
      status: input.status,
    },
  });
}

export async function updateCategory(id: string, input: UpdateCategoryInput) {
  await getCategoryById(id);
  return prisma.category.update({
    where: { id },
    data: {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.description !== undefined ? { description: input.description } : {}),
      ...(input.image !== undefined ? { image: input.image || null } : {}),
      ...(input.status !== undefined ? { status: input.status } : {}),
    },
  });
}
