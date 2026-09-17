import type { Request, Response, NextFunction } from 'express';
import * as uploadService from './upload.service.js';

export async function handleImageUpload(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await uploadService.uploadImage(req.body);
    res.json({ success: true, message: 'Image processed successfully', data });
  } catch (e) {
    next(e);
  }
}
