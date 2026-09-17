import type { Request, Response } from 'express';
import { createSaleSchema, saleQuerySchema, salesReturnSchema } from './dto.js';
import * as saleService from './service.js';

export async function listSales(req: Request, res: Response) {
  const query = saleQuerySchema.parse(req.query);
  const result = await saleService.getSales(query);
  res.json(result);
}

export async function getSale(req: Request, res: Response) {
  const sale = await saleService.getSaleById(String(req.params.id));
  res.json(sale);
}

export async function createSale(req: Request, res: Response) {
  const input = createSaleSchema.parse(req.body);
  const sale = await saleService.createSale(input);
  res.status(201).json(sale);
}

export async function cancelSale(req: Request, res: Response) {
  const result = await saleService.cancelDraftSale(String(req.params.id));
  res.json(result);
}

export async function listReturns(req: Request, res: Response) {
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 20;
  const result = await saleService.getSalesReturns({ page, limit });
  res.json(result);
}

export async function getReturn(req: Request, res: Response) {
  const result = await saleService.getSalesReturnById(String(req.params.id));
  res.json(result);
}

export async function createReturn(req: Request, res: Response) {
  const input = salesReturnSchema.parse(req.body);
  const result = await saleService.createSalesReturn(input);
  res.status(201).json(result);
}
