import { z } from 'zod';
import { paginationSchema } from '../../lib/pagination.js';

export const createCustomerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  phone: z.string().optional(),
  email: z.string().email('Invalid email address').optional().or(z.literal('')),
  address: z.string().optional(),
  openingBalance: z.coerce.number().min(0).default(0),
  notes: z.string().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE']).default('ACTIVE'),
});

export const updateCustomerSchema = createCustomerSchema.partial().omit({ openingBalance: true });

export const customerQuerySchema = paginationSchema;

export type CreateCustomerInput = z.infer<typeof createCustomerSchema>;
export type UpdateCustomerInput = z.infer<typeof updateCustomerSchema>;
export type CustomerQueryInput = z.infer<typeof customerQuerySchema>;
