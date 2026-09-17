import { Router } from 'express';
import { authenticate } from '../auth/auth.js';
import { requirePermission } from '../auth/permissions.js';
import * as controller from './role.controller.js';

const router = Router();

router.use(authenticate);

router.get('/', requirePermission('roles.read', 'users.read', 'users.manage'), controller.listRoles);
router.get('/:id', requirePermission('roles.read', 'users.read', 'users.manage'), controller.getRoleById);
router.post('/', requirePermission('roles.create', 'users.manage'), controller.createRole);
router.patch('/:id', requirePermission('roles.update', 'users.manage'), controller.updateRole);
router.delete('/:id', requirePermission('roles.delete', 'users.manage'), controller.deleteRole);

export default router;
