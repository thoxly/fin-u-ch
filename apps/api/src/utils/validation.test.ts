// Mock env.ts before importing anything that uses it
jest.mock('../config/env', () => ({
  env: {
    NODE_ENV: 'test',
    PORT: 4000,
    DATABASE_URL: 'postgresql://test',
    REDIS_URL: 'redis://localhost:6379',
    JWT_SECRET: 'test-secret',
    JWT_ACCESS_EXPIRES_IN: '15m',
    JWT_REFRESH_EXPIRES_IN: '7d',
    FRONTEND_URL: 'http://localhost:3000',
    SMTP_HOST: '',
    SMTP_PORT: 465,
    SMTP_USER: '',
    SMTP_PASS: '',
  },
}));

import {
  validateEmail,
  validatePassword,
  validateRequired,
} from './validation';
import { AppError } from '../middlewares/error';

describe('Validation Utils', () => {
  describe('validateEmail', () => {
    it('should accept valid email', () => {
      expect(() => validateEmail('test@example.com')).not.toThrow();
      expect(() => validateEmail('user.name+tag@example.co.uk')).not.toThrow();
    });

    it('should reject invalid email', () => {
      expect(() => validateEmail('invalid')).toThrow(AppError);
      expect(() => validateEmail('invalid@')).toThrow(AppError);
      expect(() => validateEmail('@example.com')).toThrow(AppError);
      expect(() => validateEmail('test@.com')).toThrow(AppError);
    });

    it('should throw error with correct message', () => {
      try {
        validateEmail('invalid');
      } catch (error) {
        expect(error).toBeInstanceOf(AppError);
        expect((error as AppError).message).toBe('Invalid email format');
        expect((error as AppError).statusCode).toBe(400);
      }
    });
  });

  describe('validatePassword', () => {
    it('should accept valid password with 12+ characters, uppercase, lowercase, and digit', () => {
      expect(() => validatePassword('ValidPass123')).not.toThrow();
      expect(() => validatePassword('LongPasswordWith1Digit')).not.toThrow();
    });

    it('should reject password with less than 12 characters', () => {
      expect(() => validatePassword('Short1P')).toThrow(AppError);
      expect(() => validatePassword('ABC123abc')).toThrow(AppError);
      expect(() => validatePassword('Pass1')).toThrow(AppError);
    });

    it('should reject password without uppercase letter', () => {
      expect(() => validatePassword('validpass123')).toThrow(AppError);
    });

    it('should reject password without lowercase letter', () => {
      expect(() => validatePassword('VALIDPASS123')).toThrow(AppError);
    });

    it('should reject password without digit', () => {
      expect(() => validatePassword('ValidPassword')).toThrow(AppError);
    });

    it('should throw error with correct message for length', () => {
      try {
        validatePassword('Short1P');
      } catch (error) {
        expect(error).toBeInstanceOf(AppError);
        expect((error as AppError).message).toBe(
          'Password must be at least 12 characters long'
        );
        expect((error as AppError).statusCode).toBe(400);
      }
    });
  });

  describe('validateRequired', () => {
    it('should accept object with all required fields', () => {
      expect(() => validateRequired({ name: 'John', age: 30 })).not.toThrow();
      expect(() =>
        validateRequired({ email: 'test@example.com' })
      ).not.toThrow();
    });

    it('should reject object with undefined value', () => {
      expect(() => validateRequired({ name: undefined })).toThrow(AppError);
    });

    it('should reject object with null value', () => {
      expect(() => validateRequired({ name: null })).toThrow(AppError);
    });

    it('should reject object with empty string', () => {
      expect(() => validateRequired({ name: '' })).toThrow(AppError);
    });

    it('should throw error with field name in message', () => {
      try {
        validateRequired({ username: '' });
      } catch (error) {
        expect(error).toBeInstanceOf(AppError);
        expect((error as AppError).message).toContain('username');
        expect((error as AppError).message).toContain('required');
        expect((error as AppError).statusCode).toBe(400);
      }
    });
  });
});
