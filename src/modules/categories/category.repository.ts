import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';

export async function findMany() {
  return prisma.category.findMany({
    include: {
      products: {
        include: {
          purchaseItems: { include: { purchase: true } },
          saleItems: { include: { sale: true } },
        },
      },
    },
    orderBy: { name: 'asc' },
  });
}

export async function findById(id: string) {
  return prisma.category.findUnique({
    where: { id },
    include: {
      products: {
        include: {
          purchaseItems: { include: { purchase: true } },
          saleItems: { include: { sale: true } },
        },
      },
    },
  });
}

export async function findByName(name: string) {
  return prisma.category.findUnique({ where: { name } });
}

export async function create(data: Prisma.CategoryCreateInput) {
  return prisma.category.create({ data });
}

export async function update(id: string, data: Prisma.CategoryUpdateInput) {
  return prisma.category.update({ where: { id }, data });
}
