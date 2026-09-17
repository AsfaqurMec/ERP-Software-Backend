import type { Request, Response, NextFunction } from 'express';
import * as roleService from './role.service.js';

export async function listRoles(_req: Request, res: Response, next: NextFunction) {
  try {
    const data = await roleService.listRoles();
    res.json({ success: true, data });
  } catch (e) {
    next(e);
  }
}

export async function getRoleById(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await roleService.getRoleById(String(req.params.id));
    res.json({ success: true, data });
  } catch (e) {
    next(e);
  }
}

export async function createRole(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await roleService.createRole(req.body);
    res.status(201).json({ success: true, message: 'Role created successfully', data });
  } catch (e) {
    next(e);
  }
}

export async function updateRole(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await roleService.updateRole(String(req.params.id), req.body);
    res.json({ success: true, message: 'Role updated successfully', data });
  } catch (e) {
    next(e);
  }
}

export async function deleteRole(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await roleService.deleteRole(String(req.params.id));
    res.json({ success: true, message: data.message });
  } catch (e) {
    next(e);
  }
}
