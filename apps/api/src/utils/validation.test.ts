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
    it('should accept password with 6 or more characters', () => {
      expect(() => validatePassword('123456')).not.toThrow();
      expect(() => validatePassword('longpassword')).not.toThrow();
    });

    it('should reject password with less than 6 characters', () => {
      expect(() => validatePassword('12345')).toThrow(AppError);
      expect(() => validatePassword('abc')).toThrow(AppError);
      expect(() => validatePassword('')).toThrow(AppError);
    });

    it('should throw error with correct message', () => {
      try {
        validatePassword('123');
      } catch (error) {
        expect(error).toBeInstanceOf(AppError);
        expect((error as AppError).message).toBe(
          'Password must be at least 6 characters long'
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
