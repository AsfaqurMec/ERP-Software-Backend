import { Router } from 'express';
import { asyncRoute } from '../../lib/http.js';
import { requirePermission } from '../auth/auth.js';
import * as controller from './category.controller.js';

const router = Router();

router.get('/', requirePermission('products.read'), asyncRoute(controller.listCategories));
router.get('/:id', requirePermission('products.read'), asyncRoute(controller.getCategory));
router.post('/', requirePermission('products.create'), asyncRoute(controller.createCategory));
router.patch('/:id', requirePermission('products.update'), asyncRoute(controller.updateCategory));

export default router;
