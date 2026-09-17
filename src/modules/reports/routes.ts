import { Router } from 'express';
import { asyncRoute } from '../../lib/http.js';
import { requirePermission } from '../auth/auth.js';
import * as controller from './controller.js';

const router = Router();

router.get('/summary', requirePermission('reports.read'), asyncRoute(controller.getSummary));
router.get('/daily', requirePermission('reports.read'), asyncRoute(controller.getDaily));
router.get('/monthly', requirePermission('reports.read'), asyncRoute(controller.getMonthly));
router.get('/yearly', requirePermission('reports.read'), asyncRoute(controller.getYearly));
router.get('/sales', requirePermission('reports.read'), asyncRoute(controller.getSales));
router.get('/purchases', requirePermission('reports.read'), asyncRoute(controller.getPurchases));
router.get('/inventory', requirePermission('reports.read'), asyncRoute(controller.getInventory));

export default router;
