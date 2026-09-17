import { z } from 'zod';
import { MovementType } from '@prisma/client';

export const adjustmentSchema = z.object({
  productId: z.string().min(1, 'Product is required'),
  type: z.enum(['IN', 'OUT']),
  quantity: z.coerce.number().positive('Quantity must be greater than zero'),
  unitCost: z.coerce.number().min(0).optional(),
  reason: z.enum([
    'Damaged',
    'Lost',
    'Expired',
    'Found',
    'Opening Stock',
    'Manual Correction',
    'Other',
  ]),
  note: z.string().optional(),
  date: z.coerce.date().optional(),
});

export const movementsQuerySchema = z.object({
  productId: z.string().optional(),
  type: z.nativeEnum(MovementType).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(200).default(50),
});

export type AdjustmentInput = z.infer<typeof adjustmentSchema>;
export type MovementsQueryInput = z.infer<typeof movementsQuerySchema>;
