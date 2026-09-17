import type { Request, Response } from 'express';
import { sendSuccess } from '../../lib/http.js';
import * as notificationService from './notification.service.js';

export async function listAlerts(_req: Request, res: Response) {
  const result = await notificationService.getLiveAlerts();
  sendSuccess(res, result, 'Live notifications and system alerts retrieved');
}
