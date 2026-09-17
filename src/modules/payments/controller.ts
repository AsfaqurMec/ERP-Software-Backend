import type { Request, Response } from 'express';
import { paymentQuerySchema, recordPaymentSchema } from './dto.js';
import * as paymentService from './service.js';

export async function listPayments(req: Request, res: Response) {
  const query = paymentQuerySchema.parse(req.query);
  const result = await paymentService.getPayments(query);
  res.json(result);
}

export async function getOverview(_req: Request, res: Response) {
  const result = await paymentService.getPaymentsOverview();
  res.json(result);
}

export async function createPayment(req: Request, res: Response) {
  const input = recordPaymentSchema.parse(req.body);
  const payment = await paymentService.recordPayment(input);
  res.status(201).json(payment);
}
