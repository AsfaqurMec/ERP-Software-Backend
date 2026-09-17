import { Router } from 'express';
import { asyncRoute } from '../../lib/http.js';
import { requirePermission } from '../auth/auth.js';
import * as controller from './sale.controller.js';

const router = Router();

router.get('/returns', requirePermission('sales.read'), asyncRoute(controller.listReturns));
router.get('/returns/:id', requirePermission('sales.read'), asyncRoute(controller.getReturn));
router.post('/returns', requirePermission('sales.return'), asyncRoute(controller.createReturn));

router.get('/', requirePermission('sales.read'), asyncRoute(controller.listSales));
router.get('/:id', requirePermission('sales.read'), asyncRoute(controller.getSale));
router.post('/', requirePermission('sales.create'), asyncRoute(controller.createSale));
router.post('/:id/cancel', requirePermission('sales.cancel'), asyncRoute(controller.cancelSale));

export default router;
