import { z } from 'zod';

export const reportQuerySchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
  date: z.string().optional(),
  year: z.coerce.number().int().optional(),
});

export type ReportQueryInput = z.infer<typeof reportQuerySchema>;
