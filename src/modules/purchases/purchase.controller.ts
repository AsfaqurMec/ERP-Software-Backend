import type { Request, Response } from 'express';
import { sendSuccess } from '../../lib/http.js';
import { createPurchaseSchema, purchaseQuerySchema, purchaseReturnSchema } from './purchase.validation.js';
import * as purchaseService from './purchase.service.js';

export async function listPurchases(req: Request, res: Response) {
  const query = purchaseQuerySchema.parse(req.query);
  const result = await purchaseService.getPurchases(query);
  sendSuccess(res, result, 'Purchases retrieved successfully');
}

export async function getPurchase(req: Request, res: Response) {
  const purchase = await purchaseService.getPurchaseById(String(req.params.id));
  sendSuccess(res, purchase, 'Purchase order retrieved');
}

export async function createPurchase(req: Request, res: Response) {
  const input = createPurchaseSchema.parse(req.body);
  const purchase = await purchaseService.createPurchase(input);
  sendSuccess(res, purchase, 'Purchase order created successfully', 201);
}

export async function cancelPurchase(req: Request, res: Response) {
  const result = await purchaseService.cancelDraftPurchase(String(req.params.id));
  sendSuccess(res, result, 'Draft purchase cancelled');
}

export async function listReturns(req: Request, res: Response) {
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 20;
  const result = await purchaseService.getPurchaseReturns({ page, limit });
  sendSuccess(res, result, 'Purchase returns retrieved');
}

export async function getReturn(req: Request, res: Response) {
  const result = await purchaseService.getPurchaseReturnById(String(req.params.id));
  sendSuccess(res, result, 'Purchase return details retrieved');
}

export async function createReturn(req: Request, res: Response) {
  const input = purchaseReturnSchema.parse(req.body);
  const result = await purchaseService.createPurchaseReturn(input);
  sendSuccess(res, result, 'Purchase return recorded successfully', 201);
}
