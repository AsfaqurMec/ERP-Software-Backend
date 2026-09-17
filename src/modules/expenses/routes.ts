import { Router } from 'express';
import { asyncRoute } from '../../lib/http.js';
import { requirePermission } from '../auth/auth.js';
import * as controller from './controller.js';

const router = Router();

router.get('/', requirePermission('expenses.read'), asyncRoute(controller.listExpenses));
router.post('/', requirePermission('expenses.create'), asyncRoute(controller.createExpense));

export default router;
