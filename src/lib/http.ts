import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { AppError } from './errors.js';

export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  error?: {
    code: string;
    details: any[];
  };
}

export function sendSuccess<T>(
  res: Response,
  data: T,
  message = 'Operation completed successfully',
  status = 200
) {
  return res.status(status).json({
    success: true,
    message,
    data,
  });
}

export function sendError(
  res: Response,
  message: string,
  code = 'ERROR',
  status = 400,
  details: any[] = []
) {
  return res.status(status).json({
    success: false,
    message,
    error: {
      code,
      details,
    },
  });
}

export const asyncRoute =
  (fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>) =>
  (req: Request, res: Response, next: NextFunction) =>
    void fn(req, res, next).catch(next);

export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ZodError) {
    const details = err.issues.map((i) => ({
      path: i.path.join('.'),
      message: i.message,
    }));
    return res.status(400).json({
      success: false,
      message: 'Validation failed for request payload or query parameters',
      error: {
        code: 'VALIDATION_ERROR',
        details,
      },
    });
  }

  if (err instanceof AppError) {
    return res.status(err.status).json({
      success: false,
      message: err.message,
      error: {
        code: err.code,
        details: [],
      },
    });
  }

  console.error('Unhandled server error:', err);
  return res.status(500).json({
    success: false,
    message: 'An unexpected internal server error occurred.',
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      details: [],
    },
  });
}
