import { Router } from 'express';
import { asyncRoute } from '../../lib/http.js';
import { requirePermission } from '../auth/permissions.js';
import * as controller from './settings.controller.js';

const router = Router();

router.get('/public', asyncRoute(controller.getPublicSettings));
router.get('/', requirePermission('users.manage', 'roles.read'), asyncRoute(controller.getSettings));
router.patch('/', requirePermission('users.manage'), asyncRoute(controller.updateSettings));
router.patch('/profile', asyncRoute(controller.updateProfile));
router.patch('/change-password', asyncRoute(controller.changePassword));

export default router;
