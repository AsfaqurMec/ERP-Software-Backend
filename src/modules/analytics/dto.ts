import { z } from 'zod';

export const analyticsQuerySchema = z.object({
  salesPeriod: z.enum(['daily', 'weekly', 'monthly', 'yearly']).default('weekly'),
  purchasesPeriod: z.enum(['daily', 'monthly', 'yearly']).default('monthly'),
  from: z.string().optional(),
  to: z.string().optional(),
});

export type AnalyticsQueryInput = z.infer<typeof analyticsQuerySchema>;
