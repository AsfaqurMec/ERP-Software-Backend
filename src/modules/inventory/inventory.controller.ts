import type { Request, Response } from 'express';
import { sendSuccess } from '../../lib/http.js';
import { adjustmentSchema, movementsQuerySchema } from './inventory.validation.js';
import * as inventoryService from './inventory.service.js';

export async function getOverview(_req: Request, res: Response) {
  const data = await inventoryService.getInventoryOverview();
  sendSuccess(res, data, 'Inventory overview retrieved');
}

export async function getMovements(req: Request, res: Response) {
  const query = movementsQuerySchema.parse(req.query);
  const result = await inventoryService.getStockMovements(query);
  sendSuccess(res, result, 'Stock movements retrieved');
}

export async function createAdjustment(req: Request, res: Response) {
  const input = adjustmentSchema.parse(req.body);
  const movement = await inventoryService.applyManualAdjustment(input);
  sendSuccess(res, movement, 'Stock adjustment applied successfully', 201);
}
