import { Router } from 'express';
import { asyncRoute } from '../../lib/http.js';
import { requirePermission } from '../auth/auth.js';
import * as controller from './controller.js';

const router = Router();

router.get('/intelligence', requirePermission('analytics.read'), asyncRoute(controller.getOwnerIntelligence));
router.get('/dashboard', requirePermission('analytics.read'), asyncRoute(controller.getDashboard));
router.get('/deep', requirePermission('analytics.read'), asyncRoute(controller.getDeepAnalytics));
router.get('/', requirePermission('analytics.read'), asyncRoute(controller.getDashboard));

export default router;

