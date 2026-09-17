import { Router } from 'express';
import { asyncRoute } from '../../lib/http.js';
import { requirePermission } from '../auth/auth.js';
import * as controller from './product.controller.js';

const router = Router();

router.get('/', requirePermission('products.read'), asyncRoute(controller.listProducts));
router.get('/:id', requirePermission('products.read'), asyncRoute(controller.getProduct));
router.post('/', requirePermission('products.create'), asyncRoute(controller.createProduct));
router.patch('/:id', requirePermission('products.update'), asyncRoute(controller.updateProduct));

export default router;
