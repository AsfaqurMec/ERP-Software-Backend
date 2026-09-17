import { Router } from 'express';
import { asyncRoute } from '../../lib/http.js';
import { requirePermission } from '../auth/auth.js';
import * as controller from './controller.js';

const router = Router();

// Returns endpoints (placed before /:id)
router.get('/returns', requirePermission('purchases.read'), asyncRoute(controller.listReturns));
router.get('/returns/:id', requirePermission('purchases.read'), asyncRoute(controller.getReturn));
router.post('/returns', requirePermission('purchases.return'), asyncRoute(controller.createReturn));

// Standard purchase endpoints
router.get('/', requirePermission('purchases.read'), asyncRoute(controller.listPurchases));
router.get('/:id', requirePermission('purchases.read'), asyncRoute(controller.getPurchase));
router.post('/', requirePermission('purchases.create'), asyncRoute(controller.createPurchase));
router.post('/:id/cancel', requirePermission('purchases.cancel'), asyncRoute(controller.cancelPurchase));

export default router;
