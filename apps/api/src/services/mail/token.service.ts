import { randomUUID } from 'crypto';
import { Prisma } from '@prisma/client';
import prisma from '../../config/db';
import logger from '../../config/logger';

export type TokenType =
  | 'email_verification'
  | 'password_reset'
  | 'email_change_old'
  | 'email_change_new'
  | 'user_invitation';

export interface CreateTokenOptions {
  userId: string;
  type: TokenType;
  expiresInMinutes?: number;
  metadata?: Record<string, unknown>;
}

export interface ValidateTokenResult {
  valid: boolean;
  userId?: string;
  metadata?: Record<string, unknown>;
  error?: string;
}

const DEFAULT_EXPIRY: Record<TokenType, number> = {
  email_verification: 7 * 24 * 60, // 7 days
  password_reset: 30, // 30 minutes
  email_change_old: 24 * 60, // 24 hours
  email_change_new: 7 * 24 * 60, // 7 days
  user_invitation: 7 * 24 * 60, // 7 days
};

export class TokenService {
  async createToken(options: CreateTokenOptions): Promise<string> {
    const { userId, type, expiresInMinutes, metadata } = options;
    const token = randomUUID();
    const expiresIn = expiresInMinutes ?? DEFAULT_EXPIRY[type];
    const expiresAt = new Date(Date.now() + expiresIn * 60 * 1000);

    // Инвалидируем все предыдущие неиспользованные токены того же типа для пользователя
    await prisma.emailToken.updateMany({
      where: {
        userId,
        type,
        used: false,
      },
      data: {
        used: true,
      },
    });

    await prisma.emailToken.create({
      data: {
        userId,
        token,
        type,
        expiresAt,
        metadata: metadata ? (metadata as Prisma.InputJsonValue) : undefined,
      },
    });

    logger.info(`Token created for user ${userId}`, {
      type,
      expiresAt,
      hasMetadata: !!metadata,
    });
    return token;
  }

  async validateToken(
    token: string,
    type: TokenType
  ): Promise<ValidateTokenResult> {
    const emailToken = await prisma.emailToken.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!emailToken) {
      return {
        valid: false,
        error: 'Token not found',
      };
    }

    if (emailToken.type !== type) {
      return {
        valid: false,
        error: 'Invalid token type',
      };
    }

    if (emailToken.used) {
      return {
        valid: false,
        error: 'Token already used',
      };
    }

    if (emailToken.expiresAt < new Date()) {
      return {
        valid: false,
        error: 'Token expired',
      };
    }

    // Для токена приглашения не проверяем isActive, так как пользователь еще не активирован
    if (type !== 'user_invitation' && !emailToken.user.isActive) {
      return {
        valid: false,
        error: 'User account is inactive',
      };
    }

    return {
      valid: true,
      userId: emailToken.userId,
      metadata: emailToken.metadata as Record<string, unknown> | undefined,
    };
  }

  async markTokenAsUsed(token: string): Promise<void> {
    await prisma.emailToken.update({
      where: { token },
      data: { used: true },
    });
  }

  async cleanupExpiredTokens(): Promise<number> {
    const result = await prisma.emailToken.deleteMany({
      where: {
        expiresAt: {
          lt: new Date(),
        },
      },
    });

    logger.info(`Cleaned up ${result.count} expired tokens`);
    return result.count;
  }
}

export default new TokenService();
