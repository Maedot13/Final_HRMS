import { Queue } from 'bullmq';
import Redis from 'ioredis';
import { logger } from '../utils/logger';

// We create a fresh connection specifically for BullMQ to avoid
// blocking the main Redis client used for rate limiting/caching.
const connection = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
    maxRetriesPerRequest: null,
});

connection.on('error', (err) => {
    logger.error('BullMQ Redis Connection Error:', err);
});

export const systemQueue = new Queue('SystemEvents', { connection: connection as any });

export enum SystemEventTypes {
    CLEARANCE_COMPLETED = 'CLEARANCE_COMPLETED',
    CLEARANCE_UNIT_APPROVED = 'CLEARANCE_UNIT_APPROVED',
    CLEARANCE_UNIT_REJECTED = 'CLEARANCE_UNIT_REJECTED',
    LEAVE_REQUESTED = 'LEAVE_REQUESTED',
    LEAVE_APPROVED = 'LEAVE_APPROVED',
    LEAVE_REJECTED = 'LEAVE_REJECTED'
}

/**
 * Dispatch an event to the background queue.
 * @param eventName The type of the event (SystemEventTypes)
 * @param payload The data associated with the event
 */
export const dispatchEvent = async (eventName: SystemEventTypes, payload: any) => {
    try {
        await systemQueue.add(eventName, payload, {
            attempts: 3,
            backoff: {
                type: 'exponential',
                delay: 1000,
            },
            removeOnComplete: true,
            removeOnFail: false,
        });
        logger.info(`[EventBus] Dispatched event: ${eventName}`);
    } catch (error) {
        logger.error(`[EventBus] Failed to dispatch event ${eventName}:`, error);
    }
};
