import type { Request, Response } from 'express';
import { sendSuccess } from '../../lib/http.js';
import { createSaleSchema, saleQuerySchema, salesReturnSchema } from './sale.validation.js';
import * as saleService from './sale.service.js';

export async function listSales(req: Request, res: Response) {
  const query = saleQuerySchema.parse(req.query);
  const result = await saleService.getSales(query);
  sendSuccess(res, result, 'Sales retrieved successfully');
}

export async function getSale(req: Request, res: Response) {
  const sale = await saleService.getSaleById(String(req.params.id));
  sendSuccess(res, sale, 'Sale details retrieved');
}

export async function createSale(req: Request, res: Response) {
  const input = createSaleSchema.parse(req.body);
  const sale = await saleService.createSale(input);
  sendSuccess(res, sale, 'Sale invoice created successfully', 201);
}

export async function cancelSale(req: Request, res: Response) {
  const result = await saleService.cancelDraftSale(String(req.params.id));
  sendSuccess(res, result, 'Draft sale cancelled');
}

export async function listReturns(req: Request, res: Response) {
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 20;
  const result = await saleService.getSalesReturns({ page, limit });
  sendSuccess(res, result, 'Sales returns retrieved');
}

export async function getReturn(req: Request, res: Response) {
  const result = await saleService.getSalesReturnById(String(req.params.id));
  sendSuccess(res, result, 'Sales return details retrieved');
}

export async function createReturn(req: Request, res: Response) {
  const input = salesReturnSchema.parse(req.body);
  const result = await saleService.createSalesReturn(input);
  sendSuccess(res, result, 'Sales return recorded successfully', 201);
}
