import { z } from 'zod';
import { paginationSchema } from '../../lib/pagination.js';

export const customerQuerySchema = paginationSchema.extend({
  search: z.string().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
  sortBy: z.enum(['name', 'balance', 'createdAt']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

export type CustomerQueryInput = z.infer<typeof customerQuerySchema>;

export const createCustomerSchema = z.object({
  name: z.string().min(1, 'Customer name is required'),
  phone: z.string().optional().nullable().transform((v) => v || null),
  email: z.string().optional().nullable().transform((v) => v || null),
  address: z.string().optional().nullable().transform((v) => v || null),
  openingBalance: z.coerce.number().min(0).default(0),
  notes: z.string().optional().nullable().transform((v) => v || null),
  status: z.enum(['ACTIVE', 'INACTIVE']).default('ACTIVE'),
});

export type CreateCustomerInput = z.infer<typeof createCustomerSchema>;

export const updateCustomerSchema = createCustomerSchema.partial().omit({ openingBalance: true });
export type UpdateCustomerInput = z.infer<typeof updateCustomerSchema>;
