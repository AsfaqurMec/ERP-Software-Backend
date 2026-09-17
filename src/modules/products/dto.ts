import { z } from 'zod';
import { paginationSchema } from '../../lib/pagination.js';

export const createProductSchema = z.object({
  sku: z.string().min(1, 'SKU is required'),
  barcode: z.string().optional(),
  name: z.string().min(2, 'Name must be at least 2 characters'),
  categoryId: z.string().min(1, 'Category is required'),
  supplierId: z.string().optional(),
  brand: z.string().optional(),
  description: z.string().optional(),
  image: z.string().url().optional().or(z.literal('')),
  unit: z.string().default('pcs'),
  purchasePrice: z.coerce.number().min(0, 'Purchase price must be non-negative'),
  sellingPrice: z.coerce.number().min(0, 'Selling price must be non-negative'),
  wholesalePrice: z.coerce.number().min(0).optional(),
  openingStock: z.coerce.number().min(0).default(0),
  minimumStock: z.coerce.number().min(0).default(0),
  maximumStock: z.coerce.number().min(0).optional(),
  status: z.enum(['ACTIVE', 'INACTIVE']).default('ACTIVE'),
});

export const updateProductSchema = createProductSchema.partial().omit({ openingStock: true });

export const productQuerySchema = paginationSchema.extend({
  categoryId: z.string().optional(),
  supplierId: z.string().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
  stockStatus: z.enum(['all', 'in_stock', 'low_stock', 'out_of_stock', 'overstocked']).default('all'),
});

export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
export type ProductQueryInput = z.infer<typeof productQuerySchema>;
