import type { Request, Response } from 'express';
import { createCategorySchema, updateCategorySchema } from './dto.js';
import * as categoryService from './service.js';

export async function listCategories(_req: Request, res: Response) {
  const data = await categoryService.getAllCategories();
  res.json({ data });
}

export async function getCategory(req: Request, res: Response) {
  const category = await categoryService.getCategoryById(String(req.params.id));
  res.json(category);
}

export async function createCategory(req: Request, res: Response) {
  const input = createCategorySchema.parse(req.body);
  const created = await categoryService.createCategory(input);
  res.status(201).json(created);
}

export async function updateCategory(req: Request, res: Response) {
  const input = updateCategorySchema.parse(req.body);
  const updated = await categoryService.updateCategory(String(req.params.id), input);
  res.json(updated);
}
