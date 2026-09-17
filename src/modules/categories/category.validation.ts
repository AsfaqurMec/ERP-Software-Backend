import { z } from 'zod';

export const createCategorySchema = z.object({
  name: z.string().min(1, 'Category name is required'),
  description: z.string().optional().nullable().transform((v) => v || null),
  image: z.string().optional().nullable().transform((v) => v || null),
  status: z.enum(['ACTIVE', 'INACTIVE']).default('ACTIVE'),
});

export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export const updateCategorySchema = createCategorySchema.partial();
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;
