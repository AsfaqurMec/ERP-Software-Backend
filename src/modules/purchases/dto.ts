import { z } from 'zod';
import { PaymentMethod } from '@prisma/client';
import { paginationSchema } from '../../lib/pagination.js';

export const purchaseItemSchema = z.object({
  productId: z.string().min(1, 'Product is required'),
  quantity: z.coerce.number().positive('Quantity must be greater than zero'),
  unitCost: z.coerce.number().min(0, 'Unit cost must be non-negative'),
  discount: z.coerce.number().min(0).default(0),
  tax: z.coerce.number().min(0).default(0),
});

export const createPurchaseSchema = z.object({
  supplierId: z.string().min(1, 'Supplier is required'),
  invoiceNumber: z.string().max(100).optional(),
  purchaseDate: z.string().datetime().or(z.string()),
  items: z.array(purchaseItemSchema).min(1, 'At least one item is required'),
  discount: z.coerce.number().min(0).default(0),
  tax: z.coerce.number().min(0).default(0),
  shipping: z.coerce.number().min(0).default(0),
  paidAmount: z.coerce.number().min(0).default(0),
  paymentMethod: z.nativeEnum(PaymentMethod).optional(),
  notes: z.string().optional(),
  status: z.enum(['DRAFT', 'CONFIRMED']).default('CONFIRMED'),
});

export const purchaseReturnSchema = z.object({
  purchaseId: z.string().min(1, 'Purchase ID is required'),
  date: z.string().datetime().or(z.string()),
  reason: z.string().min(2, 'Reason is required'),
  note: z.string().optional(),
  items: z
    .array(
      z.object({
        purchaseItemId: z.string().min(1),
        quantity: z.coerce.number().positive('Return quantity must be positive'),
      })
    )
    .min(1, 'At least one item must be returned'),
});

export const purchaseQuerySchema = paginationSchema.extend({
  supplierId: z.string().optional(),
  status: z.enum(['DRAFT', 'CONFIRMED', 'CANCELLED']).optional(),
  paymentStatus: z.enum(['UNPAID', 'PARTIAL', 'PAID']).optional(),
});

export type CreatePurchaseInput = z.infer<typeof createPurchaseSchema>;
export type PurchaseReturnInput = z.infer<typeof purchaseReturnSchema>;
export type PurchaseQueryInput = z.infer<typeof purchaseQuerySchema>;
