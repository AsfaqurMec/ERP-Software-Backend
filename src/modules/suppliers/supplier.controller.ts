import type { Request, Response } from 'express';
import { sendSuccess } from '../../lib/http.js';
import { createSupplierSchema, supplierQuerySchema, updateSupplierSchema } from './supplier.validation.js';
import * as supplierService from './supplier.service.js';

export async function listSuppliers(req: Request, res: Response) {
  const query = supplierQuerySchema.parse(req.query);
  const result = await supplierService.getSuppliers(query);
  sendSuccess(res, result, 'Suppliers retrieved successfully');
}

export async function getSupplier(req: Request, res: Response) {
  const supplier = await supplierService.getSupplierById(String(req.params.id));
  sendSuccess(res, supplier, 'Supplier profile retrieved');
}

export async function createSupplier(req: Request, res: Response) {
  const input = createSupplierSchema.parse(req.body);
  const supplier = await supplierService.createSupplier(input);
  sendSuccess(res, supplier, 'Supplier created successfully', 201);
}

export async function updateSupplier(req: Request, res: Response) {
  const input = updateSupplierSchema.parse(req.body);
  const supplier = await supplierService.updateSupplier(String(req.params.id), input);
  sendSuccess(res, supplier, 'Supplier updated successfully');
}
