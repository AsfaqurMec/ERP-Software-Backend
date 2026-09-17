import type { Request, Response } from 'express';
import { sendSuccess } from '../../lib/http.js';
import * as auditService from './audit.service.js';

export async function listActivityLogs(req: Request, res: Response) {
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 25;
  const moduleName = req.query.module as string | undefined;
  const action = req.query.action as string | undefined;
  const userId = req.query.userId as string | undefined;
  const search = req.query.search as string | undefined;

  const result = await auditService.getActivityLogs({
    page,
    limit,
    module: moduleName,
    action,
    userId,
    search,
  });

  sendSuccess(res, result, 'Activity audit logs retrieved');
}
