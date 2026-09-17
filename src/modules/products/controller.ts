import type { Request, Response } from 'express';
import { createProductSchema, productQuerySchema, updateProductSchema } from './dto.js';
import * as productService from './service.js';

export async function listProducts(req: Request, res: Response) {
  const query = productQuerySchema.parse(req.query);
  const result = await productService.getProducts(query);
  res.json(result);
}

export async function getProduct(req: Request, res: Response) {
  const product = await productService.getProductById(String(req.params.id));
  res.json(product);
}

export async function createProduct(req: Request, res: Response) {
  const input = createProductSchema.parse(req.body);
  const product = await productService.createProduct(input);
  res.status(201).json(product);
}

export async function updateProduct(req: Request, res: Response) {
  const input = updateProductSchema.parse(req.body);
  const product = await productService.updateProduct(String(req.params.id), input);
  res.json(product);
}
