import type { NextFunction, Request, Response } from 'express';
import { Role } from '../../lib/prisma.js';
import { AppError } from '../../lib/errors.js';

export type Permission =
  // Products
  | 'products.read'
  | 'products.create'
  | 'products.update'
  | 'products.delete'
  // Inventory
  | 'inventory.read'
  | 'inventory.adjust'
  // Sales
  | 'sales.read'
  | 'sales.create'
  | 'sales.update'
  | 'sales.cancel'
  | 'sales.return'
  // Purchases
  | 'purchases.read'
  | 'purchases.create'
  | 'purchases.update'
  | 'purchases.cancel'
  | 'purchases.return'
  // Customers
  | 'customers.read'
  | 'customers.create'
  | 'customers.update'
  | 'customers.delete'
  // Suppliers
  | 'suppliers.read'
  | 'suppliers.create'
  | 'suppliers.update'
  | 'suppliers.delete'
  // Payments
  | 'payments.read'
  | 'payments.create'
  // Expenses
  | 'expenses.read'
  | 'expenses.create'
  | 'expenses.update'
  | 'expenses.delete'
  // Analytics & Reports
  | 'analytics.read'
  | 'reports.read'
  // Users
  | 'users.read'
  | 'users.create'
  | 'users.update'
  | 'users.delete'
  | 'users.manage'
  // Roles
  | 'roles.read'
  | 'roles.create'
  | 'roles.update'
  | 'roles.delete';

export const ALL_PERMISSIONS: { category: string; permissions: { id: Permission; label: string }[] }[] = [
  {
    category: 'Product Catalog',
    permissions: [
      { id: 'products.read', label: 'View Products Catalog' },
      { id: 'products.create', label: 'Create New Products' },
      { id: 'products.update', label: 'Edit Product Pricing & Details' },
      { id: 'products.delete', label: 'Delete Products' },
    ],
  },
  {
    category: 'Inventory & Stock',
    permissions: [
      { id: 'inventory.read', label: 'View Stock Valuations & Movements' },
      { id: 'inventory.adjust', label: 'Perform Physical Stock Adjustments' },
    ],
  },
  {
    category: 'Sales & Invoices',
    permissions: [
      { id: 'sales.read', label: 'View Sales Invoices' },
      { id: 'sales.create', label: 'Create & Issue Invoices' },
      { id: 'sales.update', label: 'Edit Draft Sales' },
      { id: 'sales.cancel', label: 'Cancel Invoices' },
      { id: 'sales.return', label: 'Process Sales Returns' },
    ],
  },
  {
    category: 'Procurement & Purchases',
    permissions: [
      { id: 'purchases.read', label: 'View Purchase Orders' },
      { id: 'purchases.create', label: 'Create Purchase Orders' },
      { id: 'purchases.update', label: 'Edit Purchase Orders' },
      { id: 'purchases.cancel', label: 'Cancel Purchase Orders' },
      { id: 'purchases.return', label: 'Process Purchase Returns' },
    ],
  },
  {
    category: 'Customers CRM',
    permissions: [
      { id: 'customers.read', label: 'View Customer Profiles' },
      { id: 'customers.create', label: 'Add New Customers' },
      { id: 'customers.update', label: 'Edit Customer Details' },
      { id: 'customers.delete', label: 'Delete Customers' },
    ],
  },
  {
    category: 'Suppliers CRM',
    permissions: [
      { id: 'suppliers.read', label: 'View Suppliers Directory' },
      { id: 'suppliers.create', label: 'Add New Suppliers' },
      { id: 'suppliers.update', label: 'Edit Supplier Information' },
      { id: 'suppliers.delete', label: 'Delete Suppliers' },
    ],
  },
  {
    category: 'Payments Ledger',
    permissions: [
      { id: 'payments.read', label: 'View Payments Ledger & Dues' },
      { id: 'payments.create', label: 'Record Collections & Disbursements' },
    ],
  },
  {
    category: 'Operating Expenses',
    permissions: [
      { id: 'expenses.read', label: 'View Expense Transactions' },
      { id: 'expenses.create', label: 'Record New Expenses' },
      { id: 'expenses.update', label: 'Edit Expense Records' },
      { id: 'expenses.delete', label: 'Delete Expense Records' },
    ],
  },
  {
    category: 'Analytics & Intelligence',
    permissions: [
      { id: 'analytics.read', label: 'View Intelligence Dashboard & KPIs' },
      { id: 'reports.read', label: 'Generate & Export Financial Statements' },
    ],
  },
  {
    category: 'User Administration',
    permissions: [
      { id: 'users.read', label: 'View User Directory' },
      { id: 'users.create', label: 'Create New User Accounts' },
      { id: 'users.update', label: 'Edit User Roles & Passwords' },
      { id: 'users.delete', label: 'Deactivate / Delete Users' },
    ],
  },
  {
    category: 'Roles & Security',
    permissions: [
      { id: 'roles.read', label: 'View Roles & Access Policies' },
      { id: 'roles.create', label: 'Create Custom Roles' },
      { id: 'roles.update', label: 'Edit Role Permissions' },
      { id: 'roles.delete', label: 'Delete Custom Roles' },
    ],
  },
];

export const DEFAULT_ROLE_PERMISSIONS: Record<Role, Permission[] | '*'> = {
  SUPER_ADMIN: '*',
  ADMIN: [
    'products.read',
    'products.create',
    'products.update',
    'products.delete',
    'inventory.read',
    'inventory.adjust',
    'sales.read',
    'sales.create',
    'sales.update',
    'sales.cancel',
    'sales.return',
    'purchases.read',
    'purchases.create',
    'purchases.update',
    'purchases.cancel',
    'purchases.return',
    'customers.read',
    'customers.create',
    'customers.update',
    'customers.delete',
    'suppliers.read',
    'suppliers.create',
    'suppliers.update',
    'suppliers.delete',
    'payments.read',
    'payments.create',
    'expenses.read',
    'expenses.create',
    'expenses.update',
    'expenses.delete',
    'analytics.read',
    'reports.read',
    'users.read',
    'users.create',
    'users.update',
    'users.delete',
    'users.manage',
    'roles.read',
    'roles.create',
    'roles.update',
    'roles.delete',
  ],
  MANAGER: [
    'products.read',
    'products.create',
    'products.update',
    'inventory.read',
    'inventory.adjust',
    'sales.read',
    'sales.create',
    'sales.update',
    'sales.cancel',
    'sales.return',
    'purchases.read',
    'purchases.create',
    'purchases.update',
    'purchases.cancel',
    'purchases.return',
    'customers.read',
    'customers.create',
    'customers.update',
    'suppliers.read',
    'suppliers.create',
    'suppliers.update',
    'payments.read',
    'payments.create',
    'expenses.read',
    'expenses.create',
    'analytics.read',
    'reports.read',
    'users.read',
    'roles.read',
  ],
  SALES: [
    'products.read',
    'inventory.read',
    'customers.read',
    'customers.create',
    'customers.update',
    'sales.read',
    'sales.create',
    'sales.return',
    'payments.read',
    'payments.create',
  ],
  PURCHASE: [
    'products.read',
    'inventory.read',
    'suppliers.read',
    'suppliers.create',
    'suppliers.update',
    'purchases.read',
    'purchases.create',
    'purchases.return',
    'payments.read',
    'payments.create',
  ],
  ACCOUNTANT: [
    'products.read',
    'inventory.read',
    'customers.read',
    'suppliers.read',
    'sales.read',
    'purchases.read',
    'payments.read',
    'payments.create',
    'expenses.read',
    'expenses.create',
    'reports.read',
    'analytics.read',
  ],
};

export const GUEST_READ_PERMISSIONS: Permission[] = [
  'products.read',
  'inventory.read',
  'sales.read',
  'purchases.read',
  'customers.read',
  'suppliers.read',
  'payments.read',
  'expenses.read',
  'analytics.read',
  'reports.read',
  'users.read',
  'roles.read',
];

export function resolveUserPermissions(user: { role: Role; customRole?: { permissions: any } | null; isGuest?: boolean }): string[] {
  if (user.isGuest) {
    return [...GUEST_READ_PERMISSIONS];
  }

  if (user.role === 'SUPER_ADMIN') {
    return ['*'];
  }

  if (user.customRole?.permissions && Array.isArray(user.customRole.permissions)) {
    return user.customRole.permissions as string[];
  }

  const def = DEFAULT_ROLE_PERMISSIONS[user.role];
  if (def === '*') return ['*'];
  return def || [];
}

export function hasUserPermission(user: { role: Role; customRole?: { permissions: any } | null; isGuest?: boolean }, permission: Permission): boolean {
  if (user.isGuest) {
    return GUEST_READ_PERMISSIONS.includes(permission);
  }

  if (user.role === 'SUPER_ADMIN') return true;

  if (user.customRole?.permissions && Array.isArray(user.customRole.permissions)) {
    const list = user.customRole.permissions as string[];
    return list.includes(permission) || list.includes('*');
  }

  const granted = DEFAULT_ROLE_PERMISSIONS[user.role];
  if (granted === '*') return true;
  if (Array.isArray(granted)) {
    if (granted.includes(permission)) return true;
    if (permission === 'users.manage' && (granted.includes('users.create') || granted.includes('users.update'))) return true;
    if (permission === 'users.read' && granted.includes('users.manage')) return true;
  }
  return false;
}

export function requirePermission(...permissions: Permission[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const user = (req as any).user;
    if (!user || !user.role) {
      return next(new AppError(401, 'Authentication required', 'UNAUTHORIZED'));
    }

    const isAuthorized = permissions.some((perm) => hasUserPermission(user, perm));

    if (!isAuthorized) {
      return next(
        new AppError(403, `Access denied. Requires permission: ${permissions.join(' or ')}`, 'FORBIDDEN')
      );
    }

    next();
  };
}
