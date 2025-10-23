/**
 * Authentication and User types
 */

export interface Company {
  id: string;
  name: string;
  currencyBase: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}

export interface User {
  id: string;
  companyId: string;
  email: string;
  passwordHash: string;
  firstName?: string;
  lastName?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}

export interface RegisterDTO {
  email: string;
  password: string;
  companyName: string;
  currencyBase?: string;
}

export interface LoginDTO {
  email: string;
  password: string;
}

export interface TokensResponse {
  accessToken: string;
  refreshToken: string;
  user: Omit<User, 'passwordHash'>;
}

export interface RefreshTokenDTO {
  refreshToken: string;
}

export interface JWTPayload {
  userId: string;
  companyId: string;
  email: string;
}
