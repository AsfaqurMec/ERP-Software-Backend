import bcrypt from 'bcryptjs';
import { prisma } from '../../lib/prisma.js';
import { BusinessError, NotFoundError } from '../../lib/errors.js';
import { recordActivity } from '../audit/audit.service.js';
import { ensureImageUrl, isBase64DataUrl } from '../upload/upload.service.js';

const DEFAULT_SETTINGS: Record<string, { value: string; category: string }> = {
  business_name: { value: 'StockPilot Operations', category: 'BUSINESS' },
  business_logo: { value: '', category: 'BUSINESS' },
  business_phone: { value: '+880 1700-000000', category: 'BUSINESS' },
  business_email: { value: 'operations@stockpilot.io', category: 'BUSINESS' },
  business_address: { value: 'Gulshan 2, Dhaka, Bangladesh', category: 'BUSINESS' },
  business_website: { value: 'https://stockpilot.io', category: 'BUSINESS' },
  business_tax_id: { value: 'BIN-9901827461-001', category: 'BUSINESS' },

  invoice_prefix: { value: 'INV-', category: 'INVOICE' },
  invoice_number_format: { value: 'PREFIX-YEAR-SERIAL', category: 'INVOICE' },
  invoice_footer: { value: 'Thank you for your business. For inquiries, contact support@stockpilot.io', category: 'INVOICE' },
  invoice_terms: { value: 'Payment due within 14 days of invoice issue date. Goods once sold are returnable within 7 days in original packaging.', category: 'INVOICE' },

  inventory_default_unit: { value: 'Piece', category: 'INVENTORY' },
  inventory_default_tax: { value: '0', category: 'INVENTORY' },
  inventory_alert_threshold: { value: '10', category: 'INVENTORY' },
  inventory_negative_stock: { value: 'false', category: 'INVENTORY' },

  payment_method_cash: { value: 'true', category: 'PAYMENT' },
  payment_method_bank: { value: 'true', category: 'PAYMENT' },
  payment_method_bkash: { value: 'true', category: 'PAYMENT' },
  payment_method_nagad: { value: 'true', category: 'PAYMENT' },
  payment_method_card: { value: 'true', category: 'PAYMENT' },
};

export async function getAllSettings(): Promise<Record<string, string>> {
  const records = await prisma.systemSetting.findMany();
  const settingsMap: Record<string, string> = {};

  for (const [k, v] of Object.entries(DEFAULT_SETTINGS)) {
    settingsMap[k] = v.value;
  }

  for (const r of records) {
    settingsMap[r.key] = r.value;
  }

  // If business_logo is stored as base64 in DB, upload to Cloudinary and update DB
  if (settingsMap.business_logo && isBase64DataUrl(settingsMap.business_logo)) {
    try {
      const url = await ensureImageUrl(settingsMap.business_logo, 'stockpilot/branding');
      if (url) {
        settingsMap.business_logo = url;
        await prisma.systemSetting.upsert({
          where: { key: 'business_logo' },
          create: { key: 'business_logo', value: url, category: 'BUSINESS' },
          update: { value: url, category: 'BUSINESS' },
        });
      }
    } catch (e) {
      console.error('Failed to auto-migrate base64 business_logo in getAllSettings:', e);
    }
  }

  return settingsMap;
}

export async function updateSettings(userId: string | undefined, updates: Record<string, string>, ip?: string) {
  const processedUpdates = { ...updates };

  if (processedUpdates.business_logo !== undefined) {
    if (processedUpdates.business_logo) {
      const secureUrl = await ensureImageUrl(processedUpdates.business_logo, 'stockpilot/branding');
      processedUpdates.business_logo = secureUrl || '';
    } else {
      processedUpdates.business_logo = '';
    }
  }

  const operations = Object.entries(processedUpdates).map(([key, value]) => {
    const defaultMeta = DEFAULT_SETTINGS[key];
    const category = defaultMeta ? defaultMeta.category : 'GENERAL';

    return prisma.systemSetting.upsert({
      where: { key },
      create: { key, value: String(value), category },
      update: { value: String(value), category },
    });
  });

  await prisma.$transaction(operations);

  await recordActivity({
    userId,
    action: 'SETTINGS_CHANGE',
    module: 'SETTINGS',
    reference: 'System Configuration',
    details: updates,
    ip,
  });

  return getAllSettings();
}

export async function updateUserProfile(userId: string, data: { name?: string; email?: string }, ip?: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new NotFoundError('User');
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: {
      name: data.name !== undefined ? data.name : undefined,
      email: data.email !== undefined ? data.email : undefined,
    },
    select: { id: true, name: true, email: true, role: true, status: true },
  });

  await recordActivity({
    userId,
    action: 'UPDATE',
    module: 'SETTINGS',
    reference: `User Profile: ${updated.email}`,
    details: data,
    ip,
  });

  return updated;
}

export async function changeUserPassword(userId: string, oldPass: string, newPass: string, ip?: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new NotFoundError('User');
  }

  const isValid = await bcrypt.compare(oldPass, user.passwordHash);
  if (!isValid) {
    throw new BusinessError('Current password is incorrect.');
  }

  if (newPass.length < 6) {
    throw new BusinessError('New password must be at least 6 characters long.');
  }

  const newHash = await bcrypt.hash(newPass, 10);
  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash: newHash },
  });

  await recordActivity({
    userId,
    action: 'UPDATE',
    module: 'SETTINGS',
    reference: `Password Changed for ${user.email}`,
    ip,
  });

  return { success: true };
}
