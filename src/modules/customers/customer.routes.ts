import { Router } from 'express';
import { asyncRoute } from '../../lib/http.js';
import { requirePermission } from '../auth/auth.js';
import * as controller from './customer.controller.js';

const router = Router();

router.get('/', requirePermission('customers.read'), asyncRoute(controller.listCustomers));
router.get('/:id/credit-risk', requirePermission('customers.read'), asyncRoute(controller.getCustomerRisk));
router.get('/:id', requirePermission('customers.read'), asyncRoute(controller.getCustomer));
router.post('/', requirePermission('customers.create'), asyncRoute(controller.createCustomer));
router.patch('/:id', requirePermission('customers.update'), asyncRoute(controller.updateCustomer));

export default router;
