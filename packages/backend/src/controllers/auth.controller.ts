import { Request, Response } from 'express';
import * as authService from '../services/auth.service';
import { loginSchema, registerSchema, refreshTokenSchema } from '../schemas/auth.schema';
import { sendError, sendSuccess, ErrorCode } from '../utils/errorHandler';

export const login = async (req: Request, res: Response) => {
    try {
        const validation = loginSchema.safeParse(req.body);
        if (!validation.success) {
            return sendError(
                res,
                400,
                ErrorCode.VALIDATION_ERROR,
                'Invalid input',
                validation.error.format(),
                req
            );
        }

        const result = await authService.login(validation.data);
        sendSuccess(res, result);
    } catch (error: any) {
        sendError(
            res,
            401,
            ErrorCode.AUTHENTICATION_FAILED,
            error.message,
            null,
            req
        );
    }
};

export const register = async (req: Request, res: Response) => {
    try {
        const validation = registerSchema.safeParse(req.body);
        if (!validation.success) {
            return sendError(
                res,
                400,
                ErrorCode.VALIDATION_ERROR,
                'Invalid input',
                validation.error.format(),
                req
            );
        }

        const result = await authService.register(validation.data);
        sendSuccess(res, result, 201);
    } catch (error: any) {
        sendError(
            res,
            400,
            ErrorCode.INTERNAL_ERROR, // Or a more specific code if available
            error.message,
            null,
            req
        );
    }
};

export const getMe = async (req: Request, res: Response) => {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            return sendError(
                res,
                401,
                ErrorCode.UNAUTHORIZED,
                'User ID not found in token',
                null,
                req
            );
        }
        const user = await authService.getMe(userId);
        sendSuccess(res, user);
    } catch (error: any) {
        sendError(
            res,
            500,
            ErrorCode.INTERNAL_ERROR,
            error.message,
            null,
            req
        );
    }
};

export const refreshToken = async (req: Request, res: Response) => {
    try {
        const validation = refreshTokenSchema.safeParse(req.body);
        if (!validation.success) {
            return sendError(
                res,
                400,
                ErrorCode.VALIDATION_ERROR,
                'Invalid input',
                validation.error.format(),
                req
            );
        }

        const result = await authService.refreshToken(validation.data.refreshToken);
        sendSuccess(res, result);
    } catch (error: any) {
        sendError(
            res,
            401,
            ErrorCode.AUTHENTICATION_FAILED,
            error.message,
            null,
            req
        );
    }
};

export const logout = async (req: Request, res: Response) => {
    try {
        const { refreshToken } = req.body;

        // Extract access token from Authorization header
        const authHeader = req.headers.authorization;
        const accessToken = authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : undefined;

        if (refreshToken) {
            await authService.logout(refreshToken, accessToken);
        }
        sendSuccess(res, { message: 'Logged out successfully' });
    } catch (error: any) {
        // Even if logout logic fails, we tell client it's fine
        sendSuccess(res, { message: 'Logged out successfully' });
    }
};
