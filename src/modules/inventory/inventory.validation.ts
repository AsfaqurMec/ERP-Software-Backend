import { z } from 'zod';
import { paginationSchema } from '../../lib/pagination.js';

export const movementsQuerySchema = paginationSchema.extend({
  productId: z.string().optional(),
  type: z
    .enum([
      'PURCHASE',
      'SALE',
      'PURCHASE_RETURN',
      'SALES_RETURN',
      'ADJUSTMENT_IN',
      'ADJUSTMENT_OUT',
      'OPENING_STOCK',
    ])
    .optional(),
});

export type MovementsQueryInput = z.infer<typeof movementsQuerySchema>;

export const adjustmentSchema = z.object({
  productId: z.string().min(1, 'Product is required'),
  type: z.enum(['IN', 'OUT']),
  quantity: z.coerce.number().positive('Quantity must be greater than zero'),
  unitCost: z.coerce.number().nonnegative().optional(),
  reason: z.string().min(2, 'Reason is required'),
  note: z.string().optional().nullable().transform((v) => v || null),
  date: z.preprocess((val) => {
    if (!val) return new Date().toISOString();
    try {
      return new Date(val as string).toISOString();
    } catch {
      return val;
    }
  }, z.string().datetime().optional()),
});

export type AdjustmentInput = z.infer<typeof adjustmentSchema>;
