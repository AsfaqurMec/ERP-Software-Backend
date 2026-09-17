import { z } from 'zod';
import { paginationSchema } from '../../lib/pagination.js';

export const supplierQuerySchema = paginationSchema.extend({
  search: z.string().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
  sortBy: z.enum(['name', 'company', 'balance', 'createdAt']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

export type SupplierQueryInput = z.infer<typeof supplierQuerySchema>;

export const createSupplierSchema = z.object({
  name: z.string().min(1, 'Supplier name is required'),
  company: z.string().optional().nullable().transform((v) => v || null),
  phone: z.string().optional().nullable().transform((v) => v || null),
  email: z.string().optional().nullable().transform((v) => v || null),
  address: z.string().optional().nullable().transform((v) => v || null),
  openingBalance: z.coerce.number().min(0).default(0),
  notes: z.string().optional().nullable().transform((v) => v || null),
  status: z.enum(['ACTIVE', 'INACTIVE']).default('ACTIVE'),
});

export type CreateSupplierInput = z.infer<typeof createSupplierSchema>;

export const updateSupplierSchema = createSupplierSchema.partial().omit({ openingBalance: true });
export type UpdateSupplierInput = z.infer<typeof updateSupplierSchema>;
