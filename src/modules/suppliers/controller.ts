import type { Request, Response } from 'express';
import { createSupplierSchema, supplierQuerySchema, updateSupplierSchema } from './dto.js';
import * as supplierService from './service.js';

export async function listSuppliers(req: Request, res: Response) {
  const query = supplierQuerySchema.parse(req.query);
  const result = await supplierService.getSuppliers(query);
  res.json(result);
}

export async function getSupplier(req: Request, res: Response) {
  const supplier = await supplierService.getSupplierById(String(req.params.id));
  res.json(supplier);
}

export async function createSupplier(req: Request, res: Response) {
  const input = createSupplierSchema.parse(req.body);
  const supplier = await supplierService.createSupplier(input);
  res.status(201).json(supplier);
}

export async function updateSupplier(req: Request, res: Response) {
  const input = updateSupplierSchema.parse(req.body);
  const supplier = await supplierService.updateSupplier(String(req.params.id), input);
  res.json(supplier);
}
