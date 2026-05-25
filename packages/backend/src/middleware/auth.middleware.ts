
import { Request, Response, NextFunction } from 'express';
import { verifyToken, TokenPayload } from '../utils/token';
import { UserRole, UserScope } from '@hrms/types';
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

export const authorize = (allowedRoles: UserRole[], allowedPrivileges: string[] = []) => {
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

        const isSuperAdmin = req.user.role === UserRole.SUPER_ADMIN;
        const hasRole = allowedRoles.includes(req.user.role) || (req.user.isHeadHR && allowedRoles.includes(UserRole.HR_OFFICER));
        const hasPrivilege = allowedPrivileges.length > 0 && req.user.specialPrivileges?.some(p => allowedPrivileges.includes(p));

        if (!isSuperAdmin && !hasRole && !hasPrivilege) {
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

export const authorizeHeadHR = (req: Request, res: Response, next: NextFunction) => {
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
    
    // Allow SUPER_ADMIN or Head HR
    if (req.user.role !== UserRole.SUPER_ADMIN && !req.user.isHeadHR) {
        return sendError(
            res,
            403,
            ErrorCode.FORBIDDEN,
            'Head HR access required',
            null,
            req
        );
    }
    next();
};

/** Requires ADMIN or SUPER_ADMIN role and UNIVERSITY scope (university-level admin only). */
export const requireUniversityAdmin = (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
        return sendError(res, 401, ErrorCode.AUTHENTICATION_FAILED, 'User not authenticated', null, req);
    }
    const isSuperAdmin = req.user.role === UserRole.SUPER_ADMIN;
    const isUnivAdmin = req.user.role === UserRole.ADMIN && req.user.scope === UserScope.UNIVERSITY;

    if (!isSuperAdmin && !isUnivAdmin) {
        return sendError(res, 403, ErrorCode.FORBIDDEN, 'University admin access required', null, req);
    }
    next();
};

/** Blocks access to routes if user is in 'mustChangePassword' state. */
export const blockIfPasswordChangeRequired = (req: Request, res: Response, next: NextFunction) => {
    if (req.user?.mustChangePassword) {
        return sendError(
            res,
            403,
            ErrorCode.PASSWORD_CHANGE_REQUIRED,
            'You must change your password before accessing this resource',
            null,
            req
        );
    }
    next();
};
