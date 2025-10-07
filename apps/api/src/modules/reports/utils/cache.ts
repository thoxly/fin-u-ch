import redis from '../../../config/redis';
import logger from '../../../config/logger';

const DEFAULT_TTL = 300; // 5 minutes

export const cacheReport = async (
  key: string,
  data: any,
  ttl: number = DEFAULT_TTL
): Promise<void> => {
  try {
    await redis.setex(key, ttl, JSON.stringify(data));
  } catch (error) {
    logger.error('Cache set error:', error);
  }
};

export const getCachedReport = async (key: string): Promise<any | null> => {
  try {
    const cached = await redis.get(key);
    return cached ? JSON.parse(cached) : null;
  } catch (error) {
    logger.error('Cache get error:', error);
    return null;
  }
};

export const invalidateReportCache = async (
  companyId: string
): Promise<void> => {
  try {
    const pattern = `report:${companyId}:*`;
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
      await redis.del(...keys);
      logger.info(
        `Invalidated ${keys.length} cache keys for company ${companyId}`
      );
    }
  } catch (error) {
    logger.error('Cache invalidation error:', error);
  }
};

export const generateCacheKey = (
  companyId: string,
  reportType: string,
  params: any
): string => {
  const paramsHash = JSON.stringify(params);
  return `report:${companyId}:${reportType}:${Buffer.from(paramsHash).toString('base64')}`;
};
