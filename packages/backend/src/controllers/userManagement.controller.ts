import { Request, Response } from 'express';
import * as userManagementService from '../services/userManagement.service';
import {
    updateUserRoleSchema,
    toggleUserStatusSchema,
    resetPasswordSchema
} from '../schemas/userManagement.schema';
import { sendError, sendSuccess, ErrorCode } from '../utils/errorHandler';
import { auditUserUpdate, AuditAction } from '../utils/auditLog';
import { getCampusScope, getCampusIdFilter, assertSameCampus, assertCanWriteCampusResource } from '../lib/campusScope';

export const getAllUsers = async (req: Request, res: Response) => {
    try {
        const campusCtx = getCampusScope(req);
        const campusId = getCampusIdFilter(campusCtx);
        
        const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
        const page = req.query.cursor ? parseInt(req.query.cursor as string) : 1;
        
        const filters = {
            search: req.query.search as string | undefined,
            role: req.query.role as string | undefined,
            status: req.query.status as string | undefined,
            department: req.query.department as string | undefined,
            requesterRole: req.user?.role,
            isHeadHR: req.user?.isHeadHR
        };

        const users = await userManagementService.getAllUsers(campusId, page, limit, filters);
        sendSuccess(res, users);
    } catch (error: any) {
        if (error?.message === 'Missing campus context for this user') {
            return sendError(res, 403, ErrorCode.FORBIDDEN, 'Forbidden', null, req);
        }
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
        assertSameCampus(req, user.campusId);

        // Block SUPER_ADMIN from viewing disallowed roles
        if (req.user!.role === 'SUPER_ADMIN') {
            const isAllowedRole = user.role === 'SUPER_ADMIN' || user.role === 'ADMIN' || user.isHeadHR;
            if (!isAllowedRole) {
                return sendError(res, 403, ErrorCode.FORBIDDEN, 'Forbidden', null, req);
            }
        }

        sendSuccess(res, user);
    } catch (error: any) {
        if (error?.message === 'Cross-campus access denied' || error?.message === 'Missing campus context for this user') {
            return sendError(res, 403, ErrorCode.FORBIDDEN, 'Forbidden', null, req);
        }
        sendError(res, 500, ErrorCode.INTERNAL_ERROR, error.message, null, req);
    }
};

export const updateUserRole = async (req: Request, res: Response) => {
    try {
        const id = parseInt(req.params.id);
        const performerId = req.user!.userId;

        // Prevent self-role change
        if (id === performerId) {
            return sendError(res, 403, ErrorCode.FORBIDDEN, 'You cannot change your own role', null, req);
        }

        const targetUser = await userManagementService.getUserById(id);
        if (!targetUser) {
            return sendError(res, 404, ErrorCode.NOT_FOUND, 'User not found', null, req);
        }
        assertCanWriteCampusResource(req, targetUser.campusId, { allowUniversity: true });

        const validation = updateUserRoleSchema.safeParse(req.body);
        if (!validation.success) {
            return sendError(res, 400, ErrorCode.VALIDATION_ERROR, 'Invalid input', validation.error.format(), req);
        }

        const user = await userManagementService.updateUserRole(id, validation.data.role, {
            facultyId: validation.data.facultyId,
            newFacultyName: validation.data.newFacultyName,
            campusId: req.user?.campusId ?? undefined,
        });

        // Audit log
        await auditUserUpdate(
            AuditAction.USER_ROLE_UPDATE,
            performerId,
            id,
            req,
            { newRole: validation.data.role }
        );

        sendSuccess(res, user);
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Internal error';
        if (
            message === 'Cross-campus access denied' ||
            message === 'Missing campus context for this user' ||
            message === 'University admins have read-only access to local campus resources'
        ) {
            return sendError(res, 403, ErrorCode.FORBIDDEN, message, null, req);
        }
        if (message.includes('Cannot demote the last active admin')) {
            return sendError(res, 403, ErrorCode.FORBIDDEN, message, null, req);
        }
        sendError(res, 500, ErrorCode.INTERNAL_ERROR, message, null, req);
    }
};

export const toggleUserStatus = async (req: Request, res: Response) => {
    try {
        const id = parseInt(req.params.id);
        const performerId = req.user!.userId;

        // Prevent self-status toggle
        if (id === performerId) {
            return sendError(res, 403, ErrorCode.FORBIDDEN, 'You cannot deactivate your own account', null, req);
        }

        const targetUser = await userManagementService.getUserById(id);
        if (!targetUser) {
            return sendError(res, 404, ErrorCode.NOT_FOUND, 'User not found', null, req);
        }
        assertCanWriteCampusResource(req, targetUser.campusId, { allowUniversity: true });

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
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Internal error';
        if (
            message === 'Cross-campus access denied' ||
            message === 'Missing campus context for this user' ||
            message === 'University admins have read-only access to local campus resources'
        ) {
            return sendError(res, 403, ErrorCode.FORBIDDEN, message, null, req);
        }
        if (message.includes('Cannot deactivate the last active admin')) {
            return sendError(res, 403, ErrorCode.FORBIDDEN, message, null, req);
        }
        sendError(res, 500, ErrorCode.INTERNAL_ERROR, message, null, req);
    }
};

export const resetPassword = async (req: Request, res: Response) => {
    try {
        const id = parseInt(req.params.id);
        const targetUser = await userManagementService.getUserById(id);
        if (!targetUser) {
            return sendError(res, 404, ErrorCode.NOT_FOUND, 'User not found', null, req);
        }
        assertCanWriteCampusResource(req, targetUser.campusId, { allowUniversity: true });

        const result = await userManagementService.resetUserPassword(id);
        sendSuccess(res, result);
    } catch (error: any) {
        if (
            error?.message === 'Cross-campus access denied' ||
            error?.message === 'Missing campus context for this user' ||
            error?.message === 'University admins have read-only access to local campus resources'
        ) {
            return sendError(res, 403, ErrorCode.FORBIDDEN, error.message, null, req);
        }
        sendError(res, 500, ErrorCode.INTERNAL_ERROR, error.message, null, req);
    }
};
