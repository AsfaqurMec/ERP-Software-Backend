import { Router } from 'express';
import { asyncRoute } from '../../lib/http.js';
import { requirePermission } from '../auth/auth.js';
import * as controller from './controller.js';

const router = Router();

router.get('/overview', requirePermission('payments.read'), asyncRoute(controller.getOverview));
router.get('/', requirePermission('payments.read'), asyncRoute(controller.listPayments));
router.post('/', requirePermission('payments.create'), asyncRoute(controller.createPayment));

export default router;
