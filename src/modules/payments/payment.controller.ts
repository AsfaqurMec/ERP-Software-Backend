import type { Request, Response } from 'express';
import { sendSuccess } from '../../lib/http.js';
import { paymentQuerySchema, recordPaymentSchema } from './payment.validation.js';
import * as paymentService from './payment.service.js';

export async function listPayments(req: Request, res: Response) {
  const query = paymentQuerySchema.parse(req.query);
  const result = await paymentService.getPayments(query);
  sendSuccess(res, result, 'Payments retrieved successfully');
}

export async function getOverview(_req: Request, res: Response) {
  const result = await paymentService.getPaymentsOverview();
  sendSuccess(res, result, 'Payments balance overview retrieved');
}

export async function createPayment(req: Request, res: Response) {
  const input = recordPaymentSchema.parse(req.body);
  const payment = await paymentService.recordPayment(input);
  sendSuccess(res, payment, 'Payment recorded successfully', 201);
}
