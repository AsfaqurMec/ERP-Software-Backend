import type { Request, Response } from 'express';
import { sendSuccess } from '../../lib/http.js';
import * as reportService from './service.js';

export async function getSummary(req: Request, res: Response) {
  const from = req.query.from ? new Date(String(req.query.from)) : new Date(Date.now() - 30 * 86400000);
  const to = req.query.to ? new Date(String(req.query.to)) : new Date();
  const data = await reportService.getSummaryReport(from, to);
  sendSuccess(res, data, 'Summary report retrieved');
}

export async function getDaily(req: Request, res: Response) {
  const date = req.query.date ? new Date(String(req.query.date)) : new Date();
  const data = await reportService.getDailyReport(date);
  sendSuccess(res, data, 'Daily report retrieved');
}

export async function getMonthly(req: Request, res: Response) {
  const year = req.query.year ? Number(req.query.year) : undefined;
  const month = req.query.month !== undefined ? Number(req.query.month) - 1 : undefined;
  const data = await reportService.getMonthlyReport(year, month);
  sendSuccess(res, data, 'Monthly report retrieved');
}

export async function getYearly(req: Request, res: Response) {
  const year = req.query.year ? Number(req.query.year) : undefined;
  const data = await reportService.getYearlyReport(year);
  sendSuccess(res, data, 'Yearly report retrieved');
}

export async function getSales(req: Request, res: Response) {
  const from = req.query.from ? new Date(String(req.query.from)) : undefined;
  const to = req.query.to ? new Date(String(req.query.to)) : undefined;
  const data = await reportService.getSalesReport(from, to);
  sendSuccess(res, data, 'Sales report retrieved');
}

export async function getPurchases(req: Request, res: Response) {
  const from = req.query.from ? new Date(String(req.query.from)) : undefined;
  const to = req.query.to ? new Date(String(req.query.to)) : undefined;
  const data = await reportService.getPurchasesReport(from, to);
  sendSuccess(res, data, 'Purchases report retrieved');
}

export async function getInventory(_req: Request, res: Response) {
  const data = await reportService.getInventoryReport();
  sendSuccess(res, data, 'Inventory report retrieved');
}
