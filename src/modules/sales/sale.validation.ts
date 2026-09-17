import { z } from 'zod';
import { paginationSchema } from '../../lib/pagination.js';

export const saleQuerySchema = paginationSchema.extend({
  search: z.string().optional(),
  customerId: z.string().optional(),
  status: z.enum(['DRAFT', 'CONFIRMED', 'CANCELLED']).optional(),
  paymentStatus: z.enum(['UNPAID', 'PARTIAL', 'PAID']).optional(),
  hasDue: z.preprocess((v) => v === 'true' || v === true, z.boolean()).optional(),
  sortBy: z.enum(['invoiceNumber', 'saleDate', 'grandTotal', 'dueAmount', 'createdAt']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

export type SaleQueryInput = z.infer<typeof saleQuerySchema>;

export const saleItemSchema = z.object({
  productId: z.string().min(1, 'Product is required'),
  quantity: z.coerce.number().positive('Quantity must be greater than zero'),
  unitPrice: z.coerce.number().nonnegative('Unit price must be >= 0'),
  discount: z.coerce.number().min(0).default(0),
  tax: z.coerce.number().min(0).default(0),
});

export const createSaleSchema = z.object({
  customerId: z.string().optional().nullable().transform((v) => v || null),
  invoiceNumber: z.string().optional().nullable().transform((v) => v || null),
  saleDate: z.preprocess((val) => {
    if (!val) return new Date().toISOString();
    try {
      return new Date(val as string).toISOString();
    } catch {
      return val;
    }
  }, z.string().datetime()),
  status: z.enum(['DRAFT', 'CONFIRMED']).default('CONFIRMED'),
  items: z.array(saleItemSchema).min(1, 'Sale must have at least one line item'),
  discount: z.coerce.number().min(0).default(0),
  tax: z.coerce.number().min(0).default(0),
  shipping: z.coerce.number().min(0).default(0),
  paidAmount: z.coerce.number().min(0).default(0),
  paymentMethod: z.enum(['CASH', 'BANK', 'BKASH', 'NAGAD', 'CARD', 'OTHER']).optional().nullable(),
  notes: z.string().optional().nullable(),
});

export type CreateSaleInput = z.infer<typeof createSaleSchema>;

export const salesReturnItemSchema = z.object({
  saleItemId: z.string().min(1),
  quantity: z.coerce.number().positive(),
});

export const salesReturnSchema = z.object({
  saleId: z.string().min(1),
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
  items: z.array(salesReturnItemSchema).min(1),
});

export type SalesReturnInput = z.infer<typeof salesReturnSchema>;
