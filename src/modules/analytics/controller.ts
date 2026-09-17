import type { Request, Response } from 'express';
import { sendSuccess } from '../../lib/http.js';
import * as analyticsService from './service.js';
import { getOwnerIntelligence as getIntelligenceService } from './service-intelligence.js';

export async function getDashboard(req: Request, res: Response) {
  const timeframe = req.query.timeframe as string | undefined;
  const customFrom = req.query.from as string | undefined;
  const customTo = req.query.to as string | undefined;

  if (timeframe || customFrom || customTo) {
    const data = await analyticsService.getDeepAnalytics(timeframe, customFrom, customTo);
    return sendSuccess(res, data, 'Analytics data retrieved');
  }

  const data = await analyticsService.getDashboardData();
  sendSuccess(res, data, 'Dashboard metrics retrieved');
}

export async function getDeepAnalytics(req: Request, res: Response) {
  const timeframe = req.query.timeframe as string | undefined;
  const customFrom = req.query.from as string | undefined;
  const customTo = req.query.to as string | undefined;

  const data = await analyticsService.getDeepAnalytics(timeframe, customFrom, customTo);
  sendSuccess(res, data, 'Deep analytics retrieved');
}

export async function getOwnerIntelligence(req: Request, res: Response) {
  const timeframe = req.query.timeframe as string | undefined;
  const customFrom = req.query.from as string | undefined;
  const customTo = req.query.to as string | undefined;

  const data = await getIntelligenceService(timeframe, customFrom, customTo);
  sendSuccess(res, data, 'Owner intelligence retrieved successfully');
}

