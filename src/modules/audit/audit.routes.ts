import { Router } from 'express';
import { asyncRoute } from '../../lib/http.js';
import { requirePermission } from '../auth/auth.js';
import * as controller from './audit.controller.js';

const router = Router();

router.get('/', requirePermission('reports.read'), asyncRoute(controller.listActivityLogs));

export default router;
