import { AppError } from '../middlewares/error';

export const validateEmail = (email: string): void => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    throw new AppError('Invalid email format', 400);
  }
};

export const validatePassword = (password: string): void => {
  if (password.length < 6) {
    throw new AppError('Password must be at least 6 characters long', 400);
  }
};

export const validateRequired = (fields: Record<string, unknown>): void => {
  for (const [key, value] of Object.entries(fields)) {
    if (value === undefined || value === null || value === '') {
      throw new AppError(`Field '${key}' is required`, 400);
    }
  }
};
