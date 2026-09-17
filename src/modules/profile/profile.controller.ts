import type { Request, Response, NextFunction } from 'express';
import * as profileService from './profile.service.js';

export async function getProfile(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = (req as any).user.id;
    const data = await profileService.getProfile(userId);
    res.json({ success: true, data });
  } catch (e) {
    next(e);
  }
}

export async function updateProfile(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = (req as any).user.id;
    const data = await profileService.updateProfile(userId, req.body);
    res.json({ success: true, message: 'Profile updated successfully', data });
  } catch (e) {
    next(e);
  }
}

export async function changePassword(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = (req as any).user.id;
    const { currentPassword, newPassword } = req.body;
    const data = await profileService.changePassword(userId, currentPassword, newPassword);
    res.json({ success: true, message: data.message });
  } catch (e) {
    next(e);
  }
}
