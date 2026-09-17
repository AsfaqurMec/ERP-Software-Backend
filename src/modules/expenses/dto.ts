import { z } from 'zod';
import { PaymentMethod } from '@prisma/client';
import { paginationSchema } from '../../lib/pagination.js';

export const createExpenseSchema = z.object({
  category: z.string().min(1, 'Category is required'),
  amount: z.coerce.number().positive('Amount must be greater than zero'),
  date: z.string().datetime().or(z.string()),
  paymentMethod: z.nativeEnum(PaymentMethod),
  description: z.string().optional(),
  note: z.string().optional(),
});

export const expenseQuerySchema = paginationSchema.extend({
  category: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
});

export type CreateExpenseInput = z.infer<typeof createExpenseSchema>;
export type ExpenseQueryInput = z.infer<typeof expenseQuerySchema>;
