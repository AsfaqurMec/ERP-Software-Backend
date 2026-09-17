import { Router } from 'express';
import { asyncRoute } from '../../lib/http.js';
import { requirePermission } from '../auth/auth.js';
import * as controller from './controller.js';

const router = Router();

router.get('/', requirePermission('suppliers.read'), asyncRoute(controller.listSuppliers));
router.get('/:id', requirePermission('suppliers.read'), asyncRoute(controller.getSupplier));
router.post('/', requirePermission('suppliers.create'), asyncRoute(controller.createSupplier));
router.patch('/:id', requirePermission('suppliers.update'), asyncRoute(controller.updateSupplier));

export default router;
