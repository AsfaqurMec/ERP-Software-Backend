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
});
