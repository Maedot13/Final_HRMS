import { createClient } from 'redis';
import { logger } from '../utils/logger';

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

const client = createClient({
    url: redisUrl,
    // Add a short connect timeout to avoid hanging the app if Redis is missing
    socket: {
        connectTimeout: 2000,
        reconnectStrategy: (retries) => {
            if (retries > 5) {
                logger.warn('Redis: Maximum reconnection retries reached. Operations will be bypassed.');
                return false; // Stop retrying
            }
            return Math.min(retries * 500, 2000);
        }
    }
});

let isReady = false;

client.on('error', (err) => {
    logger.error('Redis error:', err);
    isReady = false;
});

client.on('ready', () => {
    logger.info('✅ Connected to Redis');
    isReady = true;
});

client.connect().catch((err) => {
    logger.error('Failed to connect to Redis at startup:', err.message);
});

// Wrapper to avoid hanging on commands if not ready
export const redis = {
    get: async (key: string) => {
        if (!isReady) return null;
        try { return await client.get(key); } catch { return null; }
    },
    set: async (key: string, value: string, options?: any) => {
        if (!isReady) return null;
        try { return await client.set(key, value, options); } catch { return null; }
    },
    del: async (key: string) => {
        if (!isReady) return 0;
        try { return await client.del(key); } catch { return 0; }
    },
    on: (event: string, callback: any) => client.on(event, callback),
    // Expose the raw client if needed, but use with caution
    raw: client
} as any;
