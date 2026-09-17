import type { Request, Response } from 'express';
import { sendSuccess } from '../../lib/http.js';
import { createExpenseSchema, expenseQuerySchema } from './expense.validation.js';
import * as expenseService from './expense.service.js';

export async function listExpenses(req: Request, res: Response) {
  const query = expenseQuerySchema.parse(req.query);
  const result = await expenseService.getExpenses(query);
  sendSuccess(res, result, 'Expenses retrieved successfully');
}

export async function createExpense(req: Request, res: Response) {
  const input = createExpenseSchema.parse(req.body);
  const expense = await expenseService.createExpense(input);
  sendSuccess(res, expense, 'Expense recorded successfully', 201);
}
