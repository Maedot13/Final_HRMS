import { redis } from '../lib/redis';

/**
 * Adds a token to the blacklist with a Time-To-Live (TTL).
 * @param token The JWT access token to blacklist
 * @param ttlSeconds Time in seconds until the token expires (should match JWT expiration)
 */
export const blacklistToken = async (token: string, ttlSeconds: number): Promise<void> => {
    try {
        await redis.set(`blacklist:${token}`, '1', {
            EX: ttlSeconds
        });
    } catch (error) {
        console.error('Redis: Failed to blacklist token', error);
        throw error;
    }
};

/**
 * Checks if a token is in the blacklist.
 * @param token The JWT access token to check
 * @returns Promise<boolean> True if blacklisted, false otherwise
 */
export const isTokenBlacklisted = async (token: string): Promise<boolean> => {
    try {
        const result = await redis.get(`blacklist:${token}`);
        return result !== null;
    } catch (error) {
        console.error('Redis: Failed to check token blacklist', error);
        // Fail open or closed? For security, maybe fail closed (reject token)
        // But for availability, we might fail open. Let's fail open for now but log.
        return false;
    }
};
