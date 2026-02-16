
import { Request, Response } from 'express';
import * as userManagementService from '../services/userManagement.service';
import {
    updateUserRoleSchema,
    toggleUserStatusSchema,
    resetPasswordSchema
} from '../schemas/userManagement.schema';
import { sendError, sendSuccess, ErrorCode } from '../utils/errorHandler';
import { auditUserUpdate, AuditAction } from '../utils/auditLog';


export const getAllUsers = async (req: Request, res: Response) => {
    try {
        const users = await userManagementService.getAllUsers();
        sendSuccess(res, users);
    } catch (error: any) {
        sendError(res, 500, ErrorCode.INTERNAL_ERROR, error.message, null, req);
    }
};

export const getUserById = async (req: Request, res: Response) => {
    try {
        const id = parseInt(req.params.id);
        const user = await userManagementService.getUserById(id);
        if (!user) {
            return sendError(res, 404, ErrorCode.NOT_FOUND, 'User not found', null, req);
        }
        sendSuccess(res, user);
    } catch (error: any) {
        sendError(res, 500, ErrorCode.INTERNAL_ERROR, error.message, null, req);
    }
};

export const updateUserRole = async (req: Request, res: Response) => {
    try {
        const id = parseInt(req.params.id);
        const performerId = (req as any).user.id;

        // Prevent self-role change
        if (id === performerId) {
            return sendError(res, 403, ErrorCode.FORBIDDEN, 'You cannot change your own role', null, req);
        }

        const validation = updateUserRoleSchema.safeParse(req.body);
        if (!validation.success) {
            return sendError(res, 400, ErrorCode.VALIDATION_ERROR, 'Invalid input', validation.error.format(), req);
        }

        const user = await userManagementService.updateUserRole(id, validation.data.role);

        // Audit log
        await auditUserUpdate(
            AuditAction.USER_ROLE_UPDATE,
            performerId,
            id,
            req,
            { newRole: validation.data.role }
        );

        sendSuccess(res, user);
    } catch (error: any) {
        sendError(res, 500, ErrorCode.INTERNAL_ERROR, error.message, null, req);
    }
};

export const toggleUserStatus = async (req: Request, res: Response) => {
    try {
        const id = parseInt(req.params.id);
        const performerId = (req as any).user.id;

        // Prevent self-status toggle
        if (id === performerId) {
            return sendError(res, 403, ErrorCode.FORBIDDEN, 'You cannot deactivate your own account', null, req);
        }

        const validation = toggleUserStatusSchema.safeParse(req.body);
        if (!validation.success) {
            return sendError(res, 400, ErrorCode.VALIDATION_ERROR, 'Invalid input', validation.error.format(), req);
        }

        const user = await userManagementService.toggleUserStatus(id, validation.data.isActive);

        // Audit log
        await auditUserUpdate(
            AuditAction.USER_STATUS_TOGGLE,
            performerId,
            id,
            req,
            { isActive: validation.data.isActive }
        );

        sendSuccess(res, user);
    } catch (error: any) {
        sendError(res, 500, ErrorCode.INTERNAL_ERROR, error.message, null, req);
    }
};

export const resetPassword = async (req: Request, res: Response) => {
    try {
        const id = parseInt(req.params.id);
        const validation = resetPasswordSchema.safeParse(req.body);
        if (!validation.success) {
            return sendError(res, 400, ErrorCode.VALIDATION_ERROR, 'Invalid input', validation.error.format(), req);
        }

        await userManagementService.resetUserPassword(id, validation.data.password);
        sendSuccess(res, { message: 'Password reset successfully' });
    } catch (error: any) {
        sendError(res, 500, ErrorCode.INTERNAL_ERROR, error.message, null, req);
    }
};
