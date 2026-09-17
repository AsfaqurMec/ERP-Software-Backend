import { Router } from 'express';
import { authenticate } from '../auth/auth.js';
import { requirePermission } from '../auth/permissions.js';
import * as controller from './upload.controller.js';

const router = Router();

router.use(authenticate);

router.post(
  '/image',
  requirePermission('products.create', 'products.update', 'users.create', 'users.update', 'users.manage', 'suppliers.create', 'suppliers.update', 'customers.create', 'customers.update'),
  controller.handleImageUpload
);

export default router;
