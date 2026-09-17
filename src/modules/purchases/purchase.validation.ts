import { z } from 'zod';
import { paginationSchema } from '../../lib/pagination.js';

export const purchaseQuerySchema = paginationSchema.extend({
  search: z.string().optional(),
  supplierId: z.string().optional(),
  status: z.enum(['DRAFT', 'CONFIRMED', 'CANCELLED']).optional(),
  paymentStatus: z.enum(['UNPAID', 'PARTIAL', 'PAID']).optional(),
  hasDue: z.preprocess((v) => v === 'true' || v === true, z.boolean()).optional(),
  sortBy: z.enum(['purchaseNumber', 'purchaseDate', 'grandTotal', 'dueAmount', 'createdAt']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

export type PurchaseQueryInput = z.infer<typeof purchaseQuerySchema>;

export const purchaseItemSchema = z.object({
  productId: z.string().min(1, 'Product is required'),
  quantity: z.coerce.number().positive('Quantity must be greater than zero'),
  unitCost: z.coerce.number().nonnegative('Unit cost must be >= 0'),
  discount: z.coerce.number().min(0).default(0),
  tax: z.coerce.number().min(0).default(0),
});

export const createPurchaseSchema = z.object({
  supplierId: z.string().min(1, 'Supplier is required'),
  invoiceNumber: z.string().optional().nullable().transform((v) => v || null),
  purchaseDate: z.preprocess((val) => {
    if (!val) return new Date().toISOString();
    try {
      return new Date(val as string).toISOString();
    } catch {
      return val;
    }
  }, z.string().datetime()),
  status: z.enum(['DRAFT', 'CONFIRMED']).default('CONFIRMED'),
  items: z.array(purchaseItemSchema).min(1, 'Purchase must have at least one line item'),
  discount: z.coerce.number().min(0).default(0),
  tax: z.coerce.number().min(0).default(0),
  shipping: z.coerce.number().min(0).default(0),
  paidAmount: z.coerce.number().min(0).default(0),
  paymentMethod: z.enum(['CASH', 'BANK', 'BKASH', 'NAGAD', 'CARD', 'OTHER']).optional().nullable(),
  notes: z.string().optional().nullable(),
});

export type CreatePurchaseInput = z.infer<typeof createPurchaseSchema>;

export const purchaseReturnItemSchema = z.object({
  purchaseItemId: z.string().min(1),
  quantity: z.coerce.number().positive(),
});

export const purchaseReturnSchema = z.object({
  purchaseId: z.string().min(1),
  date: z.preprocess((val) => {
    if (!val) return new Date().toISOString();
    try {
      return new Date(val as string).toISOString();
    } catch {
      return val;
    }
  }, z.string().datetime()),
  reason: z.string().min(2),
  note: z.string().optional().nullable(),
  items: z.array(purchaseReturnItemSchema).min(1),
});

export type PurchaseReturnInput = z.infer<typeof purchaseReturnSchema>;
