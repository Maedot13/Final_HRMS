import { Request, Response, NextFunction } from 'express';
import { redis } from '../lib/redis';
import { logger } from '../utils/logger';

export const cacheMiddleware = (durationInSeconds: number) => {
    return async (req: Request, res: Response, next: NextFunction) => {
        // Only cache GET requests
        if (req.method !== 'GET') {
            return next();
        }

        // Incorporate campus role queries into the cache key to avoid cross-campus data leakage
        const campusId = req.user?.campusId ? `campus:${req.user.campusId}` : 'campus:university';
        const role = req.user?.role || 'public';

        // Key uniquely identifies the request based on URL, query params, role, and campus scope
        const key = `cache:${campusId}:${role}:${req.originalUrl || req.url}`;

        try {
            const cachedResponse = await redis.get(key);

            if (cachedResponse) {
                // Return cache hit
                return res.json(JSON.parse(cachedResponse));
            }

            // Patch res.json to intercept the response payload
            const originalJson = res.json.bind(res);

            res.json = (body: any) => {
                // If it's a successful 2xx response, cache it
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    redis.setEx(key, durationInSeconds, JSON.stringify(body)).catch((err: Error) => {
                        logger.error(`[Cache Middleware] Redis Set Error: ${err.message}`);
                    });
                }

                return originalJson(body);
            };

            next();
        } catch (error) {
            logger.error(`[Cache Middleware] Error accessing Redis: ${error}`);
            next(); // Proceed without cache if Redis is down
        }
    };
};
