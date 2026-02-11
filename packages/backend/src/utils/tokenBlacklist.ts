import { redis } from '../lib/redis';

/**
 * Add a token to the blacklist
 * @param token - The JWT token to blacklist
 * @param expiresIn - Time in seconds until the token expires
 */
export const blacklistToken = async (token: string, expiresIn: number): Promise<void> => {
    try {
        await redis.setEx(`blacklist:${token}`, expiresIn, '1');
    } catch (error) {
        console.error('Failed to blacklist token:', error);
        throw new Error('Failed to blacklist token');
    }
};

/**
 * Check if a token is blacklisted
 * @param token - The JWT token to check
 * @returns True if the token is blacklisted, false otherwise
 */
export const isTokenBlacklisted = async (token: string): Promise<boolean> => {
    try {
        const result = await redis.get(`blacklist:${token}`);
        return result !== null;
    } catch (error) {
        console.error('Failed to check token blacklist:', error);
        // Fail open - if Redis is down, don't block all requests
        return false;
    }
};

/**
 * Remove a token from the blacklist (for testing purposes)
 * @param token - The JWT token to remove
 */
export const removeFromBlacklist = async (token: string): Promise<void> => {
    try {
        await redis.del(`blacklist:${token}`);
    } catch (error) {
        console.error('Failed to remove token from blacklist:', error);
    }
};

/**
 * Get the number of blacklisted tokens
 */
export const getBlacklistCount = async (): Promise<number> => {
    try {
        const keys = await redis.keys('blacklist:*');
        return keys.length;
    } catch (error) {
        console.error('Failed to get blacklist count:', error);
        return 0;
    }
};

/**
 * Clear all blacklisted tokens (for testing/maintenance)
 */
export const clearBlacklist = async (): Promise<void> => {
    try {
        const keys = await redis.keys('blacklist:*');
        if (keys.length > 0) {
            await redis.del(keys);
        }
    } catch (error) {
        console.error('Failed to clear blacklist:', error);
    }
};
