import { Router } from 'express';
import { authenticate } from '../auth/auth.js';
import * as controller from './profile.controller.js';

const router = Router();

router.use(authenticate);

router.get('/', controller.getProfile);
router.patch('/', controller.updateProfile);
router.post('/change-password', controller.changePassword);

export default router;
