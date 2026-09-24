import express, { Router } from 'express';
import { z } from 'zod';
import rateLimit from 'express-rate-limit';
import { asyncRoute, sendSuccess } from './lib/http.js';
import { login, loginAsGuest, authenticate, getCurrentUser, changeUserPassword } from './modules/auth/auth.js';

import categoryRoutes from './modules/categories/category.routes.js';
import productRoutes from './modules/products/product.routes.js';
import customerRoutes from './modules/customers/customer.routes.js';
import supplierRoutes from './modules/suppliers/supplier.routes.js';
import inventoryRoutes from './modules/inventory/inventory.routes.js';
import purchaseRoutes from './modules/purchases/purchase.routes.js';
import saleRoutes from './modules/sales/sale.routes.js';
import paymentRoutes from './modules/payments/payment.routes.js';
import expenseRoutes from './modules/expenses/expense.routes.js';
import analyticsRoutes from './modules/analytics/routes.js';
import reportRoutes from './modules/reports/routes.js';
import auditRoutes from './modules/audit/audit.routes.js';
import notificationRoutes from './modules/notifications/notification.routes.js';
import { getPublicSettings } from './modules/settings/settings.controller.js';
import settingsRoutes from './modules/settings/settings.routes.js';
import { userRoutes } from './modules/users/index.js';
import { roleRoutes } from './modules/roles/index.js';
import { profileRoutes } from './modules/profile/index.js';
import { uploadRoutes } from './modules/upload/index.js';

const router = Router();

// Dedicated brute-force rate limiter for authentication
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'test' ? 1000 : 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many login attempts from this IP, please try again after 15 minutes.',
    error: { code: 'TOO_MANY_ATTEMPTS', details: [] },
  },
});

// Public auth endpoint
const loginSchema = z.object({
  email: z.string().email('Valid email is required'),
  password: z.string().min(1, 'Password is required'),
});

router.post(
  '/auth/login',
  authLimiter,
  asyncRoute(async (req, res) => {
    const { email, password } = loginSchema.parse(req.body);
    const result = await login(email, password);
    sendSuccess(res, result, 'Login successful');
  })
);

router.post(
  '/auth/guest',
  authLimiter,
  asyncRoute(async (_req, res) => {
    const result = await loginAsGuest();
    sendSuccess(res, result, 'Logged in as Guest Super Admin');
  })
);

router.post(
  '/auth/logout',
  asyncRoute(async (_req, res) => {
    sendSuccess(res, { loggedOut: true }, 'Logged out successfully');
  })
);

// Public settings endpoint (for login branding, site title, logo)
router.get('/settings/public', asyncRoute(getPublicSettings));

// Protected routes (require valid JWT)
router.use(authenticate);

router.get(
  '/auth/me',
  asyncRoute(async (req, res) => {
    const user = await getCurrentUser((req as any).user.id, (req as any).user.isGuest);
    sendSuccess(res, user, 'Current session user');
  })
);

router.post(
  '/auth/change-password',
  asyncRoute(async (req, res) => {
    const userId = (req as any).user.id;
    const { currentPassword, newPassword } = req.body;
    const result = await changeUserPassword(userId, currentPassword, newPassword);
    sendSuccess(res, result, result.message);
  })
);

// Domain routes
router.use('/users', userRoutes);
router.use('/roles', roleRoutes);
router.use('/profile', profileRoutes);
router.use('/upload', express.json({ limit: '10mb' }), uploadRoutes);
router.use('/categories', categoryRoutes);
router.use('/products', productRoutes);
router.use('/customers', customerRoutes);
router.use('/suppliers', supplierRoutes);
router.use('/inventory', inventoryRoutes);
router.use('/purchases', purchaseRoutes);
router.use('/sales', saleRoutes);
router.use('/payments', paymentRoutes);
router.use('/expenses', expenseRoutes);
router.use('/analytics', analyticsRoutes);
router.use('/reports', reportRoutes);
router.use('/activity-logs', auditRoutes);
router.use('/notifications', notificationRoutes);
router.use('/settings', settingsRoutes);

export default router;
