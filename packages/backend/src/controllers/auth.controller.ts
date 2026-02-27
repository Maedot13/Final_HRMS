import { Request, Response } from 'express';
import * as authService from '../services/auth.service';
import { loginSchema, registerSchema, refreshTokenSchema, changePasswordSchema } from '../schemas/auth.schema';
import { sendError, sendSuccess, ErrorCode } from '../utils/errorHandler';

import { AuditAction } from '@prisma/client';
import { logAction } from '../services/auditLog.service';

export const login = async (req: Request, res: Response) => {
    try {
        const validation = loginSchema.safeParse(req.body);
        if (!validation.success) {
            return sendError(res, 400, ErrorCode.VALIDATION_ERROR, 'Invalid input', validation.error.format(), req);
        }

        const result = await authService.login(validation.data);

        // Audit Log
        await logAction({
            userId: result.user.id,
            action: AuditAction.USER_LOGIN,
            entityType: 'User',
            entityId: result.user.id,
            ipAddress: req.ip,
            userAgent: req.get('User-Agent')
        });

        sendSuccess(res, result);
    } catch (error: any) {
        sendError(res, 401, ErrorCode.AUTHENTICATION_FAILED, error.message, null, req);
    }
};

export const register = async (req: Request, res: Response) => {
    try {
        const validation = registerSchema.safeParse(req.body);
        if (!validation.success) {
            return sendError(res, 400, ErrorCode.VALIDATION_ERROR, 'Invalid input', validation.error.format(), req);
        }

        const creatorContext = req.user;
        if (!creatorContext) {
            return sendError(res, 401, ErrorCode.UNAUTHORIZED, 'User context not found', null, req);
        }

        const result = await authService.register(validation.data, creatorContext);

        // Audit Log
        await logAction({
            userId: result.user.id,
            action: AuditAction.USER_REGISTER,
            entityType: 'User',
            entityId: result.user.id,
            ipAddress: req.ip,
            userAgent: req.get('User-Agent')
        });

        sendSuccess(res, result, 201);
    } catch (error: any) {
        sendError(res, 400, ErrorCode.BAD_REQUEST, error.message, null, req);
    }
};

export const getMe = async (req: Request, res: Response) => {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            return sendError(res, 401, ErrorCode.UNAUTHORIZED, 'User ID not found in token', null, req);
        }
        const user = await authService.getMe(userId);
        sendSuccess(res, user);
    } catch (error: any) {
        sendError(res, 500, ErrorCode.INTERNAL_ERROR, error.message, null, req);
    }
};

export const refreshToken = async (req: Request, res: Response) => {
    try {
        const validation = refreshTokenSchema.safeParse(req.body);
        if (!validation.success) {
            return sendError(res, 400, ErrorCode.VALIDATION_ERROR, 'Invalid input', validation.error.format(), req);
        }

        const result = await authService.refreshToken(validation.data.refreshToken);
        sendSuccess(res, result);
    } catch (error: any) {
        sendError(res, 401, ErrorCode.AUTHENTICATION_FAILED, error.message, null, req);
    }
};

export const logout = async (req: Request, res: Response) => {
    try {
        const { refreshToken } = req.body;
        const authHeader = req.headers.authorization;
        const accessToken = authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : undefined;
        const userId = req.user?.userId;

        if (refreshToken) {
            await authService.logout(refreshToken, accessToken);
        }

        if (userId) {
            await logAction({
                userId,
                action: AuditAction.USER_LOGOUT,
                entityType: 'User',
                entityId: userId,
                ipAddress: req.ip,
                userAgent: req.get('User-Agent')
            });
        }

        sendSuccess(res, { message: 'Logged out successfully' });
    } catch (error: any) {
        sendSuccess(res, { message: 'Logged out successfully' });
    }
};

export const changePassword = async (req: Request, res: Response) => {
    try {
        const validation = changePasswordSchema.safeParse(req.body);
        if (!validation.success) {
            return sendError(res, 400, ErrorCode.VALIDATION_ERROR, 'Invalid input', validation.error.format(), req);
        }

        const userId = req.user?.userId;
        if (!userId) {
            return sendError(res, 401, ErrorCode.UNAUTHORIZED, 'User context not found', null, req);
        }

        await authService.changePassword(
            userId,
            validation.data.currentPassword,
            validation.data.newPassword
        );

        // Audit Log
        await logAction({
            userId,
            action: AuditAction.USER_STATUS_TOGGLE, // Repurposing since there's no password change enum
            entityType: 'User',
            entityId: userId,
            ipAddress: req.ip,
            userAgent: req.get('User-Agent'),
            changes: { reason: 'User forcibly changed their password' }
        });

        sendSuccess(res, { message: 'Password changed successfully' }, 200);
    } catch (error: any) {
        sendError(res, 400, ErrorCode.BAD_REQUEST, error.message, null, req);
    }
};
