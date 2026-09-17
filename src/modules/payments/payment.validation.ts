import { z } from 'zod';
import { paginationSchema } from '../../lib/pagination.js';

export const paymentQuerySchema = paginationSchema.extend({
  search: z.string().optional(),
  partyType: z.enum(['CUSTOMER', 'SUPPLIER']).optional(),
  partyId: z.string().optional(),
  method: z.enum(['CASH', 'BANK', 'BKASH', 'NAGAD', 'CARD', 'OTHER']).optional(),
  sortBy: z.enum(['date', 'amount', 'createdAt']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

export type PaymentQueryInput = z.infer<typeof paymentQuerySchema>;

export const recordPaymentSchema = z.object({
  partyType: z.enum(['CUSTOMER', 'SUPPLIER']),
  partyId: z.string().min(1, 'Party ID is required'),
  purchaseId: z.string().optional().nullable().transform((v) => v || null),
  saleId: z.string().optional().nullable().transform((v) => v || null),
  amount: z.coerce.number().positive('Payment amount must be greater than zero'),
  date: z.preprocess((val) => {
    if (!val) return new Date().toISOString();
    try {
      return new Date(val as string).toISOString();
    } catch {
      return val;
    }
  }, z.string().datetime()),
  method: z.enum(['CASH', 'BANK', 'BKASH', 'NAGAD', 'CARD', 'OTHER']),
  reference: z.string().optional().nullable().transform((v) => v || null),
  note: z.string().optional().nullable().transform((v) => v || null),
});

export type RecordPaymentInput = z.infer<typeof recordPaymentSchema>;
