import type { Request, Response } from 'express';
import { createCustomerSchema, customerQuerySchema, updateCustomerSchema } from './dto.js';
import * as customerService from './service.js';

export async function listCustomers(req: Request, res: Response) {
  const query = customerQuerySchema.parse(req.query);
  const result = await customerService.getCustomers(query);
  res.json(result);
}

export async function getCustomer(req: Request, res: Response) {
  const customer = await customerService.getCustomerById(String(req.params.id));
  res.json(customer);
}

export async function createCustomer(req: Request, res: Response) {
  const input = createCustomerSchema.parse(req.body);
  const customer = await customerService.createCustomer(input);
  res.status(201).json(customer);
}

export async function updateCustomer(req: Request, res: Response) {
  const input = updateCustomerSchema.parse(req.body);
  const customer = await customerService.updateCustomer(String(req.params.id), input);
  res.json(customer);
}
