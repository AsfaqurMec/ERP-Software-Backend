import { Prisma } from '@prisma/client';
import type { ProductWithSummary } from './product.types.js';

export function mapProductToSummary(product: any): ProductWithSummary {
  const stockValue = product.stock.mul(product.averageCost);

  const confirmedPurchases = (product.purchaseItems || []).filter(
    (i: any) => i.purchase?.status === 'CONFIRMED'
  );
  const totalPurchased = confirmedPurchases.reduce(
    (acc: number, item: any) => acc + item.quantity.toNumber(),
    0
  );

  const confirmedSales = (product.saleItems || []).filter(
    (i: any) => i.sale?.status === 'CONFIRMED'
  );
  const totalSold = confirmedSales.reduce(
    (acc: number, item: any) => acc + item.quantity.toNumber(),
    0
  );

  const revenue = confirmedSales.reduce(
    (acc: Prisma.Decimal, item: any) => acc.add(item.total),
    new Prisma.Decimal(0)
  );

  const totalCogs = confirmedSales.reduce(
    (acc: Prisma.Decimal, item: any) => acc.add(item.unitCost.mul(item.quantity)),
    new Prisma.Decimal(0)
  );

  const estimatedProfit = revenue.sub(totalCogs);

  return {
    id: product.id,
    sku: product.sku,
    barcode: product.barcode,
    name: product.name,
    categoryId: product.categoryId,
    category: product.category,
    supplierId: product.supplierId,
    supplier: product.supplier,
    brand: product.brand,
    description: product.description,
    image: product.image,
    unit: product.unit,
    purchasePrice: product.purchasePrice,
    sellingPrice: product.sellingPrice,
    wholesalePrice: product.wholesalePrice,
    stock: product.stock,
    averageCost: product.averageCost,
    minimumStock: product.minimumStock,
    maximumStock: product.maximumStock,
    status: product.status,
    movements: product.movements,
    summary: {
      stockValue,
      totalPurchased,
      totalSold,
      revenue,
      estimatedProfit,
    },
    createdAt: product.createdAt,
    updatedAt: product.updatedAt,
  };
}
