import type { Request, Response } from 'express';
import { createExpenseSchema, expenseQuerySchema } from './dto.js';
import * as expenseService from './service.js';

export async function listExpenses(req: Request, res: Response) {
  const query = expenseQuerySchema.parse(req.query);
  const result = await expenseService.getExpenses(query);
  res.json(result);
}

export async function createExpense(req: Request, res: Response) {
  const input = createExpenseSchema.parse(req.body);
  const expense = await expenseService.createExpense(input);
  res.status(201).json(expense);
}
