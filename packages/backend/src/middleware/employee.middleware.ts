import { Request, Response, NextFunction } from 'express';
import { Employee } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { redis } from '../lib/redis';
import { sendError, ErrorCode } from '../utils/errorHandler';

declare global {
    // eslint-disable-next-line @typescript-eslint/no-namespace
    namespace Express {
        interface Request {
            employee?: Employee;
        }
    }
}

export const attachEmployee = async (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
        return sendError(res, 401, ErrorCode.UNAUTHORIZED, 'Authentication required', null, req);
    }

    try {
        const cacheKey = `employee:${req.user.userId}`;

        // ── 1. Try Redis cache (non-fatal — falls through to DB on any error) ──
        let cachedEmployee: string | null = null;
        try {
            cachedEmployee = await redis.get(cacheKey);
        } catch (redisErr: any) {
            console.warn(`[attachEmployee] Redis GET failed (userId=${req.user.userId}): ${redisErr.message} — falling back to DB`);
        }

        if (cachedEmployee) {
            try {
                req.employee = JSON.parse(cachedEmployee);
                return next();
            } catch {
                // Corrupted cache entry — evict it and fall through to DB lookup
                console.warn(`[attachEmployee] Corrupted Redis cache for userId=${req.user.userId} — evicting and re-fetching`);
                try { await redis.del(cacheKey); } catch { /* ignore secondary Redis error */ }
            }
        }

        // ── 2. Primary DB lookup ────────────────────────────────────────────────
        const employee = await prisma.employee.findUnique({
            where: { userId: req.user.userId },
        });

        if (!employee) {
            return sendError(
                res,
                404,
                ErrorCode.NOT_FOUND,
                'Employee profile not found. Your account does not have a linked employee record — please contact HR.',
                null,
                req
            );
        }

        // ── 3. Backfill cache (non-fatal — request succeeds even if Redis fails) ─
        try {
            await redis.setEx(cacheKey, 3600, JSON.stringify(employee));
        } catch (redisErr: any) {
            console.warn(`[attachEmployee] Redis SETEX failed (userId=${req.user.userId}): ${redisErr.message} — continuing without cache`);
        }

        req.employee = employee;
        return next();

    } catch (error: any) {
        // Only genuine DB / unexpected errors reach this block
        console.error(`[attachEmployee] Unexpected error for userId=${req.user?.userId}:`, error);
        return sendError(
            res,
            500,
            ErrorCode.INTERNAL_ERROR,
            `Failed to load employee profile: ${error.message}`,
            error.message,
            req
        );
    }
};
