import { z } from 'zod';
import { paginationSchema } from '../../lib/pagination.js';

export const productQuerySchema = paginationSchema.extend({
  search: z.string().optional(),
  categoryId: z.string().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
  stockStatus: z.enum(['all', 'in_stock', 'low_stock', 'out_of_stock', 'overstocked']).optional(),
  sortBy: z.enum(['name', 'sku', 'sellingPrice', 'stock', 'createdAt']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

export type ProductQueryInput = z.infer<typeof productQuerySchema>;

export const createProductSchema = z.object({
  sku: z.string().min(1, 'SKU is required'),
  barcode: z.string().optional().nullable().transform((v) => v || null),
  name: z.string().min(1, 'Product name is required'),
  categoryId: z.string().min(1, 'Category is required'),
  supplierId: z.string().optional().nullable().transform((v) => v || null),
  brand: z.string().optional().nullable().transform((v) => v || null),
  description: z.string().optional().nullable().transform((v) => v || null),
  image: z.string().optional().nullable().transform((v) => v || null),
  unit: z.string().default('pcs'),
  purchasePrice: z.coerce.number().min(0, 'Purchase price must be >= 0'),
  sellingPrice: z.coerce.number().min(0, 'Selling price must be >= 0'),
  wholesalePrice: z.coerce.number().min(0).optional().nullable().transform((v) => (v !== undefined && v !== null && !isNaN(v) ? v : null)),
  openingStock: z.coerce.number().min(0).default(0),
  minimumStock: z.coerce.number().min(0).default(0),
  maximumStock: z.coerce.number().min(0).optional().nullable().transform((v) => (v !== undefined && v !== null && !isNaN(v) ? v : null)),
  status: z.enum(['ACTIVE', 'INACTIVE']).default('ACTIVE'),
});

export type CreateProductInput = z.infer<typeof createProductSchema>;

export const updateProductSchema = createProductSchema.partial().omit({ openingStock: true });
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
