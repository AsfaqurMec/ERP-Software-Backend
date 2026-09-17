import type { Request, Response } from 'express';
import { sendSuccess } from '../../lib/http.js';
import { createCategorySchema, updateCategorySchema } from './category.validation.js';
import * as categoryService from './category.service.js';

export async function listCategories(_req: Request, res: Response) {
  const categories = await categoryService.getCategories();
  sendSuccess(res, categories, 'Categories retrieved successfully');
}

export async function getCategory(req: Request, res: Response) {
  const category = await categoryService.getCategoryById(String(req.params.id));
  sendSuccess(res, category, 'Category details retrieved');
}

export async function createCategory(req: Request, res: Response) {
  const input = createCategorySchema.parse(req.body);
  const category = await categoryService.createCategory(input);
  sendSuccess(res, category, 'Category created successfully', 201);
}

export async function updateCategory(req: Request, res: Response) {
  const input = updateCategorySchema.parse(req.body);
  const category = await categoryService.updateCategory(String(req.params.id), input);
  sendSuccess(res, category, 'Category updated successfully');
}
