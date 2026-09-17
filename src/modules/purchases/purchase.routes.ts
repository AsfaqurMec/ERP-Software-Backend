import { Router } from 'express';
import { asyncRoute } from '../../lib/http.js';
import { requirePermission } from '../auth/auth.js';
import * as controller from './purchase.controller.js';

const router = Router();

router.get('/returns', requirePermission('purchases.read'), asyncRoute(controller.listReturns));
router.get('/returns/:id', requirePermission('purchases.read'), asyncRoute(controller.getReturn));
router.post('/returns', requirePermission('purchases.return'), asyncRoute(controller.createReturn));

router.get('/', requirePermission('purchases.read'), asyncRoute(controller.listPurchases));
router.get('/:id', requirePermission('purchases.read'), asyncRoute(controller.getPurchase));
router.post('/', requirePermission('purchases.create'), asyncRoute(controller.createPurchase));
router.post('/:id/cancel', requirePermission('purchases.cancel'), asyncRoute(controller.cancelPurchase));

export default router;
