import { describe, it, expect } from 'vitest';
import { validatePasswordStrength, createToken } from '../src/modules/auth/auth.js';
import { isBase64DataUrl } from '../src/modules/upload/upload.service.js';
import { jwtVerify } from 'jose';

describe('Security Suite', () => {
  describe('Password Complexity Policy', () => {
    it('should reject passwords shorter than 8 characters', () => {
      expect(() => validatePasswordStrength('short1')).toThrow('at least 8 characters');
    });

    it('should reject passwords containing only letters', () => {
      expect(() => validatePasswordStrength('alllettersonly')).toThrow('both letters and numbers');
    });

    it('should reject passwords containing only numbers', () => {
      expect(() => validatePasswordStrength('1234567890')).toThrow('both letters and numbers');
    });

    it('should accept strong passwords with letters and numbers', () => {
      expect(() => validatePasswordStrength('SuperSecurePass123')).not.toThrow();
    });
  });

  describe('JWT Session & Invalidation Claims', () => {
    it('should embed pwdSig claim matching the user password hash suffix', async () => {
      const mockUser = {
        id: 'user_123',
        role: 'ADMIN',
        passwordHash: '$2a$10$e9H0V4Q6s8t2X0kL7mNpOuABCDEFGHIJ',
      };

      const token = await createToken(mockUser);
      expect(typeof token).toBe('string');

      // Verify token contains pwdSig
      const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'development-secret-change-me-min-32-chars-long!');
      const { payload } = await jwtVerify(token, secret);

      expect(payload.sub).toBe('user_123');
      expect(payload.role).toBe('ADMIN');
      expect(payload.pwdSig).toBe(mockUser.passwordHash.slice(-10));
    });
  });

  describe('Upload Sanitization & Whitelisting', () => {
    it('should accept valid base64 image data URLs (jpeg, png, webp, gif)', () => {
      expect(isBase64DataUrl('data:image/jpeg;base64,/9j/4AAQSkZJRg...')).toBe(true);
      expect(isBase64DataUrl('data:image/png;base64,iVBORw0KGgo...')).toBe(true);
      expect(isBase64DataUrl('data:image/webp;base64,UklGR...')).toBe(true);
    });

    it('should reject non-image, svg, or malicious data URLs', () => {
      expect(isBase64DataUrl('data:text/html;base64,PHNjcmlwdD4...')).toBe(false);
      expect(isBase64DataUrl('data:application/javascript;base64,YWxlcnQoMSk=')).toBe(false);
      expect(isBase64DataUrl('data:image/svg+xml;base64,PHN2Zz4=')).toBe(false);
      expect(isBase64DataUrl('random_text_string')).toBe(false);
    });
  });

  describe('Guest Mode Policy & Permissions', () => {
    it('should embed isGuest claim in JWT token for guest user', async () => {
      const mockGuest = {
        id: 'guest_user_1',
        role: 'SUPER_ADMIN',
        isGuest: true,
      };

      const token = await createToken(mockGuest);
      const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'development-secret-change-me-min-32-chars-long!');
      const { payload } = await jwtVerify(token, secret);

      expect(payload.sub).toBe('guest_user_1');
      expect(payload.role).toBe('SUPER_ADMIN');
      expect(payload.isGuest).toBe(true);
    });

    it('should grant only view/read permissions to guest account', async () => {
      const { resolveUserPermissions, hasUserPermission } = await import('../src/modules/auth/permissions.js');
      const guestUser = { role: 'SUPER_ADMIN' as any, isGuest: true };

      const permissions = resolveUserPermissions(guestUser);
      expect(permissions).not.toContain('*');
      expect(permissions).toContain('products.read');
      expect(permissions).toContain('sales.read');
      expect(permissions).toContain('purchases.read');
      expect(permissions).toContain('inventory.read');
      expect(permissions).toContain('reports.read');
      expect(permissions).toContain('analytics.read');
      expect(permissions).toContain('users.read');
      expect(permissions).toContain('roles.read');

      // Verify write permissions are denied
      expect(permissions).not.toContain('products.create');
      expect(permissions).not.toContain('products.delete');
      expect(permissions).not.toContain('sales.create');
      expect(permissions).not.toContain('users.delete');

      // Verify hasUserPermission check
      expect(hasUserPermission(guestUser, 'products.read')).toBe(true);
      expect(hasUserPermission(guestUser, 'analytics.read')).toBe(true);
      expect(hasUserPermission(guestUser, 'products.create')).toBe(false);
      expect(hasUserPermission(guestUser, 'sales.create')).toBe(false);
      expect(hasUserPermission(guestUser, 'users.manage' as any)).toBe(false);
      expect(hasUserPermission(guestUser, 'inventory.adjust')).toBe(false);
    });
  });
});
