import { z } from 'zod';
import { paginationSchema } from '../../lib/pagination.js';

export const createSupplierSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  company: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email('Invalid email address').optional().or(z.literal('')),
  address: z.string().optional(),
  openingBalance: z.coerce.number().min(0).default(0),
  notes: z.string().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE']).default('ACTIVE'),
});

export const updateSupplierSchema = createSupplierSchema.partial().omit({ openingBalance: true });

export const supplierQuerySchema = paginationSchema;

export type CreateSupplierInput = z.infer<typeof createSupplierSchema>;
export type UpdateSupplierInput = z.infer<typeof updateSupplierSchema>;
export type SupplierQueryInput = z.infer<typeof supplierQuerySchema>;
