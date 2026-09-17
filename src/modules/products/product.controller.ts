import type { Request, Response } from 'express';
import { sendSuccess } from '../../lib/http.js';
import { createProductSchema, productQuerySchema, updateProductSchema } from './product.validation.js';
import * as productService from './product.service.js';

export async function listProducts(req: Request, res: Response) {
  const query = productQuerySchema.parse(req.query);
  const result = await productService.getProducts(query);
  sendSuccess(res, result, 'Products retrieved successfully');
}

export async function getProduct(req: Request, res: Response) {
  const product = await productService.getProductById(String(req.params.id));
  sendSuccess(res, product, 'Product specifications retrieved');
}

export async function createProduct(req: Request, res: Response) {
  const input = createProductSchema.parse(req.body);
  const product = await productService.createProduct(input);
  sendSuccess(res, product, 'Product created successfully', 201);
}

export async function updateProduct(req: Request, res: Response) {
  const input = updateProductSchema.parse(req.body);
  const product = await productService.updateProduct(String(req.params.id), input);
  sendSuccess(res, product, 'Product updated successfully');
}
