import Redis from 'ioredis';
import { env } from './env';
import logger from './logger';
import { redisConnectionStatusGauge } from './metrics';

const redis = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: 3,
  retryStrategy: (times: number) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
  enableReadyCheck: true,
  enableOfflineQueue: false, // Don't queue commands when disconnected
  lazyConnect: false, // Connect immediately
  family: 4, // Use IPv4
  keepAlive: 30000, // Keep connection alive for 30 seconds
  connectTimeout: 10000, // 10 second connection timeout
  commandTimeout: 5000, // 5 second command timeout
});

redis.on('connect', () => {
  logger.info('Redis connected');
  redisConnectionStatusGauge.set(1);
});

redis.on('ready', () => {
  redisConnectionStatusGauge.set(1);
});

redis.on('close', () => {
  redisConnectionStatusGauge.set(0);
});

redis.on('error', (err) => {
  logger.error('Redis error:', err);
  redisConnectionStatusGauge.set(0);
});

redis.on('reconnecting', () => {
  redisConnectionStatusGauge.set(0);
});

export default redis;
