import type { Request, Response } from 'express';
import { adjustmentSchema, movementsQuerySchema } from './dto.js';
import * as inventoryService from './service.js';

export async function getOverview(_req: Request, res: Response) {
  const data = await inventoryService.getInventoryOverview();
  res.json(data);
}

export async function getMovements(req: Request, res: Response) {
  const query = movementsQuerySchema.parse(req.query);
  const result = await inventoryService.getStockMovements(query);
  res.json(result);
}

export async function createAdjustment(req: Request, res: Response) {
  const input = adjustmentSchema.parse(req.body);
  const movement = await inventoryService.applyManualAdjustment(input);
  res.status(201).json(movement);
}
