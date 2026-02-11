import { Request, Response } from 'express';
import * as authService from '../services/auth.service';
import { loginSchema, registerSchema, refreshTokenSchema } from '../schemas/auth.schema';

export const login = async (req: Request, res: Response) => {
    try {
        const validation = loginSchema.safeParse(req.body);
        if (!validation.success) {
            return res.status(400).json({
                error: {
                    code: 'VALIDATION_ERROR',
                    message: 'Invalid input',
                    details: validation.error.format(),
                    timestamp: new Date().toISOString()
                }
            });
        }

        const result = await authService.login(validation.data);
        res.json(result);
    } catch (error: any) {
        res.status(401).json({
            error: {
                code: 'AUTHENTICATION_FAILED',
                message: error.message,
                timestamp: new Date().toISOString()
            }
        });
    }
};

export const register = async (req: Request, res: Response) => {
    try {
        const validation = registerSchema.safeParse(req.body);
        if (!validation.success) {
            return res.status(400).json({
                error: {
                    code: 'VALIDATION_ERROR',
                    message: 'Invalid input',
                    details: validation.error.format(),
                    timestamp: new Date().toISOString()
                }
            });
        }

        const result = await authService.register(validation.data);
        res.status(201).json(result);
    } catch (error: any) {
        res.status(400).json({
            error: {
                code: 'REGISTRATION_FAILED',
                message: error.message,
                timestamp: new Date().toISOString()
            }
        });
    }
};

export const getMe = async (req: Request, res: Response) => {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            return res.status(401).json({
                error: {
                    code: 'UNAUTHORIZED',
                    message: 'User ID not found in token',
                    timestamp: new Date().toISOString()
                }
            });
        }
        const user = await authService.getMe(userId);
        res.json(user);
    } catch (error: any) {
        res.status(500).json({
            error: {
                code: 'INTERNAL_ERROR',
                message: error.message,
                timestamp: new Date().toISOString()
            }
        });
    }
};

export const refreshToken = async (req: Request, res: Response) => {
    try {
        const validation = refreshTokenSchema.safeParse(req.body);
        if (!validation.success) {
            return res.status(400).json({
                error: {
                    code: 'VALIDATION_ERROR',
                    message: 'Invalid input',
                    details: validation.error.format(),
                    timestamp: new Date().toISOString()
                }
            });
        }

        const result = await authService.refreshToken(validation.data.refreshToken);
        res.json(result);
    } catch (error: any) {
        res.status(401).json({
            error: {
                code: 'INVALID_REFRESH_TOKEN',
                message: error.message,
                timestamp: new Date().toISOString()
            }
        });
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
        res.json({ message: 'Logged out successfully' });
    } catch (error: any) {
        // Even if logout logic fails, we tell client it's fine
        res.json({ message: 'Logged out successfully' });
    }
};
