import Redis from 'ioredis';
import { env } from './env';
import logger from './logger';
import { redisConnectionStatusGauge } from './metrics';

// Create Redis client with better error handling
const redis = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: 3,
  retryStrategy: (times: number) => {
    const delay = Math.min(times * 50, 2000);
    logger.warn(`Redis reconnecting (attempt ${times}) in ${delay}ms`);
    return delay;
  },
  enableReadyCheck: true,
  enableOfflineQueue: false, // Don't queue commands when disconnected
  lazyConnect: true, // Don't connect immediately - we'll connect manually
  family: 4, // Use IPv4
  keepAlive: 30000, // Keep connection alive for 30 seconds
  connectTimeout: 10000, // 10 second connection timeout
  commandTimeout: 5000, // 5 second command timeout
  // Don't fail on connection errors in development
  showFriendlyErrorStack: process.env.NODE_ENV === 'development',
});

redis.on('connect', () => {
  logger.info('Redis connected');
  redisConnectionStatusGauge.set(1);
});

redis.on('ready', () => {
  logger.info('Redis ready');
  redisConnectionStatusGauge.set(1);
});

redis.on('close', () => {
  logger.warn('Redis connection closed');
  redisConnectionStatusGauge.set(0);
});

redis.on('error', (err) => {
  // Log error but don't crash the server
  logger.error('Redis error:', err.message || err);
  redisConnectionStatusGauge.set(0);

  // In development, just warn; in production, this might be critical
  if (process.env.NODE_ENV === 'production') {
    logger.error('Redis is critical for production - check connection');
  }
});

redis.on('reconnecting', () => {
  logger.info('Redis reconnecting...');
  redisConnectionStatusGauge.set(0);
});

// Try to connect, but don't fail if it doesn't work
redis.connect().catch((err) => {
  logger.warn(`Redis initial connection failed: ${err.message || err}`);
  if (process.env.NODE_ENV === 'production') {
    logger.error(
      'Redis connection failed in production - some features may not work'
    );
  }
});

export default redis;
