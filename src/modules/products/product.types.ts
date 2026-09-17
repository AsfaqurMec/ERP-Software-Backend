import { Prisma, RecordStatus } from '@prisma/client';

export interface ProductSummary {
  stockValue: Prisma.Decimal;
  totalPurchased: number;
  totalSold: number;
  revenue: Prisma.Decimal;
  estimatedProfit: Prisma.Decimal;
}

export interface ProductWithSummary {
  id: string;
  sku: string;
  barcode: string | null;
  name: string;
  categoryId: string;
  category?: any;
  supplierId: string | null;
  supplier?: any;
  brand: string | null;
  description: string | null;
  image: string | null;
  unit: string;
  purchasePrice: Prisma.Decimal;
  sellingPrice: Prisma.Decimal;
  wholesalePrice: Prisma.Decimal | null;
  stock: Prisma.Decimal;
  averageCost: Prisma.Decimal;
  minimumStock: Prisma.Decimal;
  maximumStock: Prisma.Decimal | null;
  status: RecordStatus;
  summary: ProductSummary;
  movements?: any[];
  createdAt: Date;
  updatedAt: Date;
}
