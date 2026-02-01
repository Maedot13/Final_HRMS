
import { Request, Response } from 'express';
import * as authService from '../services/auth.service';

export const login = async (req: Request, res: Response) => {
    try {
        const result = await authService.login(req.body);
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
        const result = await authService.register(req.body);
        res.status(201).json(result);
    } catch (error: any) {
        res.status(400).json({
            error: {
                code: 'REGISTRATION_FAILED', // Could be ALREADY_EXISTS etc.
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
}
