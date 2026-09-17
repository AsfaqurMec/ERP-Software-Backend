import type { Request, Response } from 'express';
import { sendSuccess } from '../../lib/http.js';
import * as settingsService from './settings.service.js';

export async function getPublicSettings(_req: Request, res: Response) {
  const settings = await settingsService.getAllSettings();
  const publicKeys = [
    'business_name',
    'business_logo',
    'currency_symbol',
    'business_phone',
    'business_email',
    'business_address',
    'business_website',
    'business_tax_id',
    'invoice_prefix',
    'invoice_footer',
    'invoice_terms',
  ];
  const publicSettings: Record<string, string> = {};
  for (const k of publicKeys) {
    if (settings[k] !== undefined) {
      publicSettings[k] = settings[k];
    }
  }
  sendSuccess(res, publicSettings, 'Public brand settings retrieved');
}

export async function getSettings(_req: Request, res: Response) {
  const settings = await settingsService.getAllSettings();
  sendSuccess(res, settings, 'System settings retrieved');
}

export async function updateSettings(req: Request, res: Response) {
  const userId = (req as any).user?.id;
  const ip = req.ip || req.socket.remoteAddress;
  const updated = await settingsService.updateSettings(userId, req.body, ip);
  sendSuccess(res, updated, 'Settings updated successfully');
}

export async function updateProfile(req: Request, res: Response) {
  const userId = (req as any).user?.id;
  const ip = req.ip || req.socket.remoteAddress;
  const user = await settingsService.updateUserProfile(userId, req.body, ip);
  sendSuccess(res, user, 'Profile updated successfully');
}

export async function changePassword(req: Request, res: Response) {
  const userId = (req as any).user?.id;
  const ip = req.ip || req.socket.remoteAddress;
  const { currentPassword, newPassword } = req.body;
  const result = await settingsService.changeUserPassword(userId, currentPassword, newPassword, ip);
  sendSuccess(res, result, 'Password changed successfully');
}
