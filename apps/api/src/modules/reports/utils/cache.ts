import redis from '../../../config/redis';
import logger from '../../../config/logger';
import {
  redisCacheHitCounter,
  redisCacheMissCounter,
  redisOperationDurationHistogram,
} from '../../../config/metrics';

const DEFAULT_TTL = 300; // 5 minutes

export const cacheReport = async (
  key: string,
  data: unknown,
  ttl: number = DEFAULT_TTL
): Promise<void> => {
  const start = Date.now();
  try {
    await redis.setex(key, ttl, JSON.stringify(data));
    const duration = (Date.now() - start) / 1000;
    redisOperationDurationHistogram.observe(
      { operation: 'set', status: 'success' },
      duration
    );
  } catch (error) {
    const duration = (Date.now() - start) / 1000;
    redisOperationDurationHistogram.observe(
      { operation: 'set', status: 'error' },
      duration
    );
    logger.error('Cache set error:', error);
  }
};

export const getCachedReport = async (key: string): Promise<unknown | null> => {
  const start = Date.now();
  try {
    const cached = await redis.get(key);
    const duration = (Date.now() - start) / 1000;
    redisOperationDurationHistogram.observe(
      { operation: 'get', status: 'success' },
      duration
    );

    if (cached) {
      redisCacheHitCounter.inc({ cache_type: 'report' });
      return JSON.parse(cached);
    } else {
      redisCacheMissCounter.inc({ cache_type: 'report' });
      return null;
    }
  } catch (error) {
    const duration = (Date.now() - start) / 1000;
    redisOperationDurationHistogram.observe(
      { operation: 'get', status: 'error' },
      duration
    );
    redisCacheMissCounter.inc({ cache_type: 'report' });
    logger.error('Cache get error:', error);
    return null;
  }
};

export const invalidateReportCache = async (
  companyId: string
): Promise<void> => {
  try {
    const pattern = `report:${companyId}:*`;
    const keys: string[] = [];

    // Use SCAN instead of KEYS for non-blocking iteration
    // SCAN is better for production as it doesn't block Redis
    return new Promise<void>((resolve, reject) => {
      const stream = redis.scanStream({
        match: pattern,
        count: 100, // Scan in batches of 100
      });

      stream.on('data', async (resultKeys: string[]) => {
        // Collect all keys matching the pattern
        keys.push(...resultKeys);
      });

      stream.on('end', async () => {
        try {
          // Delete all collected keys in batches
          if (keys.length > 0) {
            // Delete in batches to avoid large DEL commands
            const batchSize = 100;
            for (let i = 0; i < keys.length; i += batchSize) {
              const batch = keys.slice(i, i + batchSize);
              await redis.del(...batch);
            }
            logger.info(
              `Invalidated ${keys.length} cache keys for company ${companyId}`
            );
          }
          resolve();
        } catch (error) {
          reject(error);
        }
      });

      stream.on('error', (error) => {
        logger.error('Cache invalidation scan error:', error);
        reject(error);
      });
    });
  } catch (error) {
    logger.error('Cache invalidation error:', error);
    throw error;
  }
};

export const generateCacheKey = (
  companyId: string,
  reportType: string,
  params: unknown
): string => {
  const paramsHash = JSON.stringify(params);
  return `report:${companyId}:${reportType}:${Buffer.from(paramsHash).toString('base64')}`;
};
