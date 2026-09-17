import { z } from 'zod';
import { PaymentMethod } from '@prisma/client';
import { paginationSchema } from '../../lib/pagination.js';

export const saleItemSchema = z.object({
  productId: z.string().min(1, 'Product is required'),
  quantity: z.coerce.number().positive('Quantity must be greater than zero'),
  unitPrice: z.coerce.number().min(0, 'Unit price must be non-negative'),
  discount: z.coerce.number().min(0).default(0),
  tax: z.coerce.number().min(0).default(0),
});

export const createSaleSchema = z.object({
  customerId: z.string().optional().or(z.literal('')),
  invoiceNumber: z.string().max(100).optional(),
  saleDate: z.string().datetime().or(z.string()),
  items: z.array(saleItemSchema).min(1, 'At least one item is required'),
  discount: z.coerce.number().min(0).default(0),
  tax: z.coerce.number().min(0).default(0),
  shipping: z.coerce.number().min(0).default(0),
  paidAmount: z.coerce.number().min(0).default(0),
  paymentMethod: z.nativeEnum(PaymentMethod).optional(),
  notes: z.string().optional(),
  status: z.enum(['DRAFT', 'CONFIRMED']).default('CONFIRMED'),
});

export const salesReturnSchema = z.object({
  saleId: z.string().min(1, 'Sale ID is required'),
  date: z.string().datetime().or(z.string()),
  reason: z.string().min(2, 'Reason is required'),
  note: z.string().optional(),
  items: z
    .array(
      z.object({
        saleItemId: z.string().min(1),
        quantity: z.coerce.number().positive('Return quantity must be positive'),
      })
    )
    .min(1, 'At least one item must be returned'),
});

export const saleQuerySchema = paginationSchema.extend({
  customerId: z.string().optional(),
  status: z.enum(['DRAFT', 'CONFIRMED', 'CANCELLED']).optional(),
  paymentStatus: z.enum(['UNPAID', 'PARTIAL', 'PAID']).optional(),
});

export type CreateSaleInput = z.infer<typeof createSaleSchema>;
export type SalesReturnInput = z.infer<typeof salesReturnSchema>;
export type SaleQueryInput = z.infer<typeof saleQuerySchema>;
