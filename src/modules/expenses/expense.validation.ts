import { z } from 'zod';
import { paginationSchema } from '../../lib/pagination.js';

export const expenseQuerySchema = paginationSchema.extend({
  search: z.string().optional(),
  category: z.string().optional(),
  paymentMethod: z.enum(['CASH', 'BANK', 'BKASH', 'NAGAD', 'CARD', 'OTHER']).optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  sortBy: z.enum(['date', 'amount', 'createdAt']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

export type ExpenseQueryInput = z.infer<typeof expenseQuerySchema>;

export const createExpenseSchema = z.object({
  category: z.string().min(2, 'Category is required'),
  amount: z.coerce.number().positive('Expense amount must be greater than zero'),
  date: z.preprocess((val) => {
    if (!val) return new Date().toISOString();
    try {
      return new Date(val as string).toISOString();
    } catch {
      return val;
    }
  }, z.string().datetime()),
  paymentMethod: z.enum(['CASH', 'BANK', 'BKASH', 'NAGAD', 'CARD', 'OTHER']).default('CASH'),
  description: z.string().optional().nullable().transform((v) => v || null),
  note: z.string().optional().nullable().transform((v) => v || null),
});

export type CreateExpenseInput = z.infer<typeof createExpenseSchema>;
