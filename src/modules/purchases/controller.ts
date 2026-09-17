import type { Request, Response } from 'express';
import { createPurchaseSchema, purchaseQuerySchema, purchaseReturnSchema } from './dto.js';
import * as purchaseService from './service.js';

export async function listPurchases(req: Request, res: Response) {
  const query = purchaseQuerySchema.parse(req.query);
  const result = await purchaseService.getPurchases(query);
  res.json(result);
}

export async function getPurchase(req: Request, res: Response) {
  const purchase = await purchaseService.getPurchaseById(String(req.params.id));
  res.json(purchase);
}

export async function createPurchase(req: Request, res: Response) {
  const input = createPurchaseSchema.parse(req.body);
  const purchase = await purchaseService.createPurchase(input);
  res.status(201).json(purchase);
}

export async function cancelPurchase(req: Request, res: Response) {
  const result = await purchaseService.cancelDraftPurchase(String(req.params.id));
  res.json(result);
}

export async function listReturns(req: Request, res: Response) {
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 20;
  const result = await purchaseService.getPurchaseReturns({ page, limit });
  res.json(result);
}

export async function getReturn(req: Request, res: Response) {
  const result = await purchaseService.getPurchaseReturnById(String(req.params.id));
  res.json(result);
}

export async function createReturn(req: Request, res: Response) {
  const input = purchaseReturnSchema.parse(req.body);
  const result = await purchaseService.createPurchaseReturn(input);
  res.status(201).json(result);
}
