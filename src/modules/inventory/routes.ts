import { Router } from 'express';
import { asyncRoute } from '../../lib/http.js';
import { requirePermission } from '../auth/auth.js';
import * as controller from './controller.js';

const router = Router();

router.get('/overview', requirePermission('inventory.read'), asyncRoute(controller.getOverview));
router.get('/movements', requirePermission('inventory.read'), asyncRoute(controller.getMovements));
router.post('/adjustments', requirePermission('inventory.adjust'), asyncRoute(controller.createAdjustment));

export default router;
