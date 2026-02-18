import { createClient } from 'redis';

const globalForRedis = global as unknown as { redis: ReturnType<typeof createClient> };

export const redis =
    globalForRedis.redis ||
    createClient({
        url: process.env.REDIS_URL || 'redis://localhost:6379',
    });

if (process.env.NODE_ENV !== 'production') globalForRedis.redis = redis;

import { logger } from '../utils/logger';

// Connect to Redis
redis.connect().catch((error) => {
    logger.error('Failed to connect to Redis:', error);
});

// Handle errors
redis.on('error', (error) => {
    logger.error('Redis error:', error);
});

redis.on('connect', () => {
    logger.info('✅ Connected to Redis');
});
