import { Prisma } from '@prisma/client';
import { buildPaginatedResult, type PaginatedResult } from '../../lib/pagination.js';
import * as expenseRepo from './expense.repository.js';
import type { CreateExpenseInput, ExpenseQueryInput } from './expense.validation.js';

export async function getExpenses(query: ExpenseQueryInput): Promise<PaginatedResult<any>> {
  const result = await expenseRepo.findManyPaginated(query);
  return buildPaginatedResult(result.data, result.total, result.page, result.limit);
}

export async function createExpense(input: CreateExpenseInput) {
  const amount = new Prisma.Decimal(input.amount);
  const date = new Date(input.date);

  return expenseRepo.create({
    category: input.category,
    amount,
    date,
    paymentMethod: input.paymentMethod,
    description: input.description || null,
    note: input.note || null,
  });
}
