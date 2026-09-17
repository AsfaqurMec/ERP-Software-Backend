import type { Request, Response, NextFunction } from 'express';
import * as userService from './user.service.js';

export async function listUsers(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await userService.listUsers(req.query as any);
    res.json({ success: true, data });
  } catch (e) {
    next(e);
  }
}

export async function getUserById(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await userService.getUserById(String(req.params.id));
    res.json({ success: true, data });
  } catch (e) {
    next(e);
  }
}

export async function createUser(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await userService.createUser(req.body);
    res.status(201).json({ success: true, message: 'User account created successfully', data });
  } catch (e) {
    next(e);
  }
}

export async function updateUser(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await userService.updateUser(String(req.params.id), req.body);
    res.json({ success: true, message: 'User account updated successfully', data });
  } catch (e) {
    next(e);
  }
}

export async function updateUserStatus(req: Request, res: Response, next: NextFunction) {
  try {
    const currentUserId = (req as any).user.id;
    const data = await userService.updateUserStatus(String(req.params.id), req.body.status, currentUserId);
    res.json({ success: true, message: `User status changed to ${req.body.status}`, data });
  } catch (e) {
    next(e);
  }
}

export async function updateUserRole(req: Request, res: Response, next: NextFunction) {
  try {
    const currentUserId = (req as any).user.id;
    const data = await userService.updateUserRole(String(req.params.id), req.body, currentUserId);
    res.json({ success: true, message: 'User role updated successfully', data });
  } catch (e) {
    next(e);
  }
}

export async function deleteUser(req: Request, res: Response, next: NextFunction) {
  try {
    const currentUserId = (req as any).user.id;
    const data = await userService.deleteUser(String(req.params.id), currentUserId);
    res.json({ success: true, message: data.message });
  } catch (e) {
    next(e);
  }
}
