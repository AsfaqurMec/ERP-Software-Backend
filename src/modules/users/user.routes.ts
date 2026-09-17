import { Router } from 'express';
import { authenticate } from '../auth/auth.js';
import { requirePermission } from '../auth/permissions.js';
import * as controller from './user.controller.js';

const router = Router();

router.use(authenticate);

router.get('/', requirePermission('users.read', 'users.manage'), controller.listUsers);
router.get('/:id', requirePermission('users.read', 'users.manage'), controller.getUserById);
router.post('/', requirePermission('users.create', 'users.manage'), controller.createUser);
router.patch('/:id', requirePermission('users.update', 'users.manage'), controller.updateUser);
router.patch('/:id/status', requirePermission('users.update', 'users.manage'), controller.updateUserStatus);
router.patch('/:id/role', requirePermission('users.update', 'users.manage'), controller.updateUserRole);
router.delete('/:id', requirePermission('users.delete', 'users.manage'), controller.deleteUser);

export default router;
