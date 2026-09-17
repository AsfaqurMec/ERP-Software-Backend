import { z } from 'zod';
import { PartyType, PaymentMethod } from '@prisma/client';
import { paginationSchema } from '../../lib/pagination.js';

export const recordPaymentSchema = z.object({
  partyType: z.nativeEnum(PartyType),
  partyId: z.string().min(1, 'Party ID is required'),
  amount: z.coerce.number().positive('Payment amount must be greater than zero'),
  date: z.string().datetime().or(z.string()),
  method: z.nativeEnum(PaymentMethod),
  reference: z.string().optional(),
  note: z.string().optional(),
});

export const paymentQuerySchema = paginationSchema.extend({
  partyType: z.nativeEnum(PartyType).optional(),
  method: z.nativeEnum(PaymentMethod).optional(),
  partyId: z.string().optional(),
});

export type RecordPaymentInput = z.infer<typeof recordPaymentSchema>;
export type PaymentQueryInput = z.infer<typeof paymentQuerySchema>;
