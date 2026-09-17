import type { Request, Response } from 'express';
import { sendSuccess } from '../../lib/http.js';
import { createCustomerSchema, customerQuerySchema, updateCustomerSchema } from './customer.validation.js';
import * as customerService from './customer.service.js';

export async function listCustomers(req: Request, res: Response) {
  const query = customerQuerySchema.parse(req.query);
  const result = await customerService.getCustomers(query);
  sendSuccess(res, result, 'Customers retrieved successfully');
}

export async function getCustomer(req: Request, res: Response) {
  const customer = await customerService.getCustomerById(String(req.params.id));
  sendSuccess(res, customer, 'Customer profile retrieved');
}

export async function createCustomer(req: Request, res: Response) {
  const input = createCustomerSchema.parse(req.body);
  const customer = await customerService.createCustomer(input);
  sendSuccess(res, customer, 'Customer created successfully', 201);
}

export async function updateCustomer(req: Request, res: Response) {
  const input = updateCustomerSchema.parse(req.body);
  const customer = await customerService.updateCustomer(String(req.params.id), input);
  sendSuccess(res, customer, 'Customer updated successfully');
}
