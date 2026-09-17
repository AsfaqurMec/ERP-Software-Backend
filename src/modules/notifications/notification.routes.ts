import { Router } from 'express';
import { asyncRoute } from '../../lib/http.js';
import * as controller from './notification.controller.js';

const router = Router();

router.get('/', asyncRoute(controller.listAlerts));

export default router;
