
import { Request, Response } from 'express';
import * as notificationService from '../services/notification.service';
import { sendError, sendSuccess, ErrorCode } from '../utils/errorHandler';

export const getMyNotifications = async (req: Request, res: Response) => {
    try {
        const userId = req.user!.userId;
        const notifications = await notificationService.getUserNotifications(userId);
        sendSuccess(res, notifications);
    } catch (error: any) {
        sendError(res, 500, ErrorCode.INTERNAL_ERROR, error.message, null, req);
    }
};

export const markAsRead = async (req: Request, res: Response) => {
    try {
        const id = parseInt(req.params.id);
        const userId = req.user!.userId;
        await notificationService.markAsRead(id, userId);
        sendSuccess(res, { message: 'Notification marked as read' });
    } catch (error: any) {
        sendError(res, 500, ErrorCode.INTERNAL_ERROR, error.message, null, req);
    }
};

export const markAllAsRead = async (req: Request, res: Response) => {
    try {
        const userId = req.user!.userId;
        await notificationService.markAllAsRead(userId);
        sendSuccess(res, { message: 'All notifications marked as read' });
    } catch (error: any) {
        sendError(res, 500, ErrorCode.INTERNAL_ERROR, error.message, null, req);
    }
};

export const getUnreadCount = async (req: Request, res: Response) => {
    try {
        const userId = req.user!.userId;
        const count = await notificationService.getUnreadCount(userId);
        sendSuccess(res, { count });
    } catch (error: any) {
        sendError(res, 500, ErrorCode.INTERNAL_ERROR, error.message, null, req);
    }
};
