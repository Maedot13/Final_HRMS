
import { Request, Response, NextFunction } from 'express';
import { verifyToken, TokenPayload } from '../utils/token';
import { UserRole } from '@hrms/types';
import { isTokenBlacklisted } from '../utils/tokenBlacklist';
import { sendError, ErrorCode } from '../utils/errorHandler';

// Extend Express Request to include user
declare global {
    // eslint-disable-next-line @typescript-eslint/no-namespace
    namespace Express {
        interface Request {
            user?: TokenPayload;
        }
    }
}

export const authenticate = async (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith('Bearer ')) {
        return sendError(
            res,
            401,
            ErrorCode.AUTHENTICATION_FAILED,
            'No token provided',
            null,
            req
        );
    }

    const token = authHeader.split(' ')[1];

    try {
        // Check if token is blacklisted
        const isBlacklisted = await isTokenBlacklisted(token);
        if (isBlacklisted) {
            return sendError(
                res,
                401,
                ErrorCode.AUTHENTICATION_FAILED,
                'Token has been revoked',
                null,
                req
            );
        }

        const payload = verifyToken(token);
        req.user = payload;
        next();
    } catch (error: any) {
        return sendError(
            res,
            401,
            ErrorCode.AUTHENTICATION_FAILED,
            'Invalid or expired token',
            null,
            req
        );
    }
};

export const authorize = (allowedRoles: UserRole[]) => {
    return (req: Request, res: Response, next: NextFunction) => {
        if (!req.user) {
            return sendError(
                res,
                401,
                ErrorCode.AUTHENTICATION_FAILED,
                'User not authenticated',
                null,
                req
            );
        }

        if (!allowedRoles.includes(req.user.role)) {
            return sendError(
                res,
                403,
                ErrorCode.FORBIDDEN,
                'Insufficient permissions',
                null,
                req
            );
        }

        next();
    };
};
