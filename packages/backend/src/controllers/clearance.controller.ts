
import { Request, Response } from 'express';
import * as clearanceService from '../services/clearance.service';
import { UserRole } from '@hrms/types';
import { z } from 'zod';
import { sanitizeInput } from '../utils/sanitize';

import {
    initiateClearanceSchema,
    approveCheckSchema,
    rejectCheckSchema
} from '../schemas/clearance.schema';

import { AuditAction } from '@prisma/client';
import { logAction } from '../services/auditLog.service';
import { sendError, sendSuccess, ErrorCode } from '../utils/errorHandler';
import { getCampusScope, getCampusIdFilter, assertSameCampus } from '../lib/campusScope';

// ... (schema definition remains)

export const initiateClearance = async (req: Request, res: Response) => {
    try {
        const user = req.user;
        if (!user) return sendError(res, 401, ErrorCode.UNAUTHORIZED, 'Unauthorized', null, req);

        // Validation handled by middleware or manual here...
        // For consistency in this specific file (which seems to have manual validation logic in the snippet),
        // we keep the manual logic if it was there, or adapt. The snippet shows manual validation.
        // Assuming we want to keep it or replace it. Let's keep existing logic structure but add logs.

        // RE-FETCHING logic from previous view... keeping it as is but wrapping in standardized response if needed.
        // Wait, the previous file view showed `res.status(201).json`. Ideally we standardize.
        // I will standardize AND add logs.

        const validation = initiateClearanceSchema.safeParse(req.body);
        if (!validation.success) return sendError(res, 400, ErrorCode.VALIDATION_ERROR, 'Invalid input', validation.error.format(), req);

        const { getEmployeeByUserId } = await import('../services/employee.service');
        const employee = await getEmployeeByUserId(user.userId);
        if (!employee) return sendError(res, 404, ErrorCode.NOT_FOUND, 'Employee profile not found', null, req);

        const lastWorkingDay = new Date(validation.data.lastWorkingDay);
        const sanitizedReason = sanitizeInput(validation.data.reason);

        const result = await clearanceService.initiateClearance(employee.id, sanitizedReason, lastWorkingDay);

        await logAction({
            userId: user.userId,
            action: AuditAction.CLEARANCE_INITIATE,
            entityType: 'ClearanceRequest',
            entityId: result.id,
            ipAddress: req.ip,
            userAgent: req.get('User-Agent')
        });

        sendSuccess(res, result, 201);
    } catch (error: any) {
        sendError(res, 400, ErrorCode.INTERNAL_ERROR, error.message, null, req);
    }
};

// ... (initiateClearance above)

export const listClearanceRequests = async (req: Request, res: Response) => {
    try {
        const user = req.user;
        if (!user) return sendError(res, 401, ErrorCode.UNAUTHORIZED, 'Unauthorized', null, req);

        const { status, limit, offset } = req.query;

        const campusCtx = getCampusScope(req);
        const campusIdFilter = getCampusIdFilter(campusCtx);

        const result = await clearanceService.listClearanceRequests({
            status: status as string | undefined,
            campusId: campusIdFilter,
            limit: limit ? parseInt(limit as string) : undefined,
            offset: offset ? parseInt(offset as string) : undefined,
        });

        sendSuccess(res, result.data);
    } catch (error: any) {
        if (error?.message === 'Missing campus context for this user') {
            return sendError(res, 403, ErrorCode.FORBIDDEN, 'Forbidden', null, req);
        }
        sendError(res, 500, ErrorCode.INTERNAL_ERROR, error.message, null, req);
    }
};

export const getClearance = async (req: Request, res: Response) => {
    try {
        const clearanceId = parseInt(req.params.id);
        if (isNaN(clearanceId)) {
            return sendError(res, 400, ErrorCode.VALIDATION_ERROR, 'Invalid clearance ID', null, req);
        }

        const clearance = await clearanceService.getClearance(clearanceId);

        if (!clearance) {
            return sendError(res, 404, ErrorCode.NOT_FOUND, 'Clearance request not found', null, req);
        }

        // Campus isolation: campus users can only view clearances in their campus
        assertSameCampus(req, clearance.campusId);

        sendSuccess(res, clearance);
    } catch (error: any) {
        if (error?.message === 'Cross-campus access denied' || error?.message === 'Missing campus context for this user') {
            return sendError(res, 403, ErrorCode.FORBIDDEN, 'Forbidden', null, req);
        }
        sendError(res, 500, ErrorCode.INTERNAL_ERROR, error.message, null, req);
    }
};

export const approveCheck = async (req: Request, res: Response) => {
    try {
        const clearanceId = parseInt(req.params.id);
        const user = req.user;
        if (!user) return sendError(res, 401, ErrorCode.UNAUTHORIZED, 'Unauthorized', null, req);

        const validation = approveCheckSchema.safeParse(req.body);
        if (!validation.success) return sendError(res, 400, ErrorCode.VALIDATION_ERROR, 'Invalid input', validation.error.format(), req);
        const { unitId, comment } = validation.data;

        if (![UserRole.ADMIN, UserRole.DEPARTMENT_HEAD, UserRole.HR_OFFICER].includes(user.role)) {
            return sendError(res, 403, ErrorCode.FORBIDDEN, 'Forbidden', null, req);
        }

        const { getEmployeeByUserId } = await import('../services/employee.service');
        const approver = await getEmployeeByUserId(user.userId);
        if (!approver) return sendError(res, 400, ErrorCode.VALIDATION_ERROR, 'Approver profile not found', null, req);

        const sanitizedComment = comment ? sanitizeInput(comment) : undefined;

        const campusCtx = getCampusScope(req);
        const approverCampusId = campusCtx.scope === 'CAMPUS' ? campusCtx.campusId : null;

        const result = await clearanceService.approveCheck(clearanceId, unitId, approver.id, user.userId, approverCampusId, sanitizedComment);

        await logAction({
            userId: user.userId,
            action: AuditAction.CLEARANCE_APPROVE,
            entityType: 'ClearanceCheck', // or Request
            entityId: clearanceId,
            changes: { unitId, status: 'APPROVED', comment: sanitizedComment },
            ipAddress: req.ip,
            userAgent: req.get('User-Agent')
        });

        sendSuccess(res, result);
    } catch (error: any) {
        if (error?.message === 'Cross-campus access denied' || error?.message === 'Missing campus context for this user') {
            return sendError(res, 403, ErrorCode.FORBIDDEN, 'Forbidden', null, req);
        }
        sendError(res, 400, ErrorCode.INTERNAL_ERROR, error.message, null, req);
    }
};

export const rejectCheck = async (req: Request, res: Response) => {
    try {
        const clearanceId = parseInt(req.params.id);
        const user = req.user;
        if (!user) return sendError(res, 401, ErrorCode.UNAUTHORIZED, 'Unauthorized', null, req);

        const validation = rejectCheckSchema.safeParse(req.body);
        if (!validation.success) return sendError(res, 400, ErrorCode.VALIDATION_ERROR, 'Invalid input', validation.error.format(), req);
        const { unitId, comment } = validation.data;

        if (!comment) return sendError(res, 400, ErrorCode.VALIDATION_ERROR, 'Comment is required for rejection', null, req);

        if (![UserRole.ADMIN, UserRole.DEPARTMENT_HEAD, UserRole.HR_OFFICER].includes(user.role)) {
            return sendError(res, 403, ErrorCode.FORBIDDEN, 'Forbidden', null, req);
        }

        const { getEmployeeByUserId } = await import('../services/employee.service');
        const approver = await getEmployeeByUserId(user.userId);
        if (!approver) return sendError(res, 400, ErrorCode.VALIDATION_ERROR, 'Approver profile not found', null, req);

        const sanitizedComment = sanitizeInput(comment);

        const campusCtx = getCampusScope(req);
        const approverCampusId = campusCtx.scope === 'CAMPUS' ? campusCtx.campusId : null;

        const result = await clearanceService.rejectCheck(clearanceId, unitId, approver.id, user.userId, approverCampusId, sanitizedComment);

        await logAction({
            userId: user.userId,
            action: AuditAction.CLEARANCE_REJECT,
            entityType: 'ClearanceCheck',
            entityId: clearanceId,
            changes: { unitId, status: 'REJECTED', comment: sanitizedComment },
            ipAddress: req.ip,
            userAgent: req.get('User-Agent')
        });

        sendSuccess(res, result);
    } catch (error: any) {
        if (error?.message === 'Cross-campus access denied' || error?.message === 'Missing campus context for this user') {
            return sendError(res, 403, ErrorCode.FORBIDDEN, 'Forbidden', null, req);
        }
        sendError(res, 400, ErrorCode.INTERNAL_ERROR, error.message, null, req);
    }
};

// Get pending checks for a specific unit (for approver dashboard)
export const getPendingChecksForUnit = async (req: Request, res: Response) => {
    try {
        const unitId = parseInt(req.params.unitId);
        if (isNaN(unitId)) {
            return sendError(res, 400, ErrorCode.VALIDATION_ERROR, 'Invalid unit ID', null, req);
        }

        const user = req.user;
        if (!user) return sendError(res, 401, ErrorCode.UNAUTHORIZED, 'Unauthorized', null, req);

        // Authorization: Only ADMIN, DEPARTMENT_HEAD, or HR_OFFICER can view pending checks
        if (![UserRole.ADMIN, UserRole.DEPARTMENT_HEAD, UserRole.HR_OFFICER].includes(user.role)) {
            return sendError(res, 403, ErrorCode.FORBIDDEN, 'Forbidden: Insufficient permissions', null, req);
        }

        const campusCtx = getCampusScope(req);
        const campusIdFilter = getCampusIdFilter(campusCtx);

        const pendingChecks = await clearanceService.getPendingChecksForUnit(unitId, campusIdFilter);
        sendSuccess(res, pendingChecks);
    } catch (error: any) {
        if (error?.message === 'Missing campus context for this user') {
            return sendError(res, 403, ErrorCode.FORBIDDEN, 'Forbidden', null, req);
        }
        sendError(res, 500, ErrorCode.INTERNAL_ERROR, error.message, null, req);
    }
};

export const deleteClearanceUnit = async (req: Request, res: Response) => {
    try {
        const unitId = parseInt(req.params.unitId);
        if (isNaN(unitId)) {
            return sendError(res, 400, ErrorCode.VALIDATION_ERROR, 'Invalid unit ID', null, req);
        }

        const user = req.user;
        if (!user) return sendError(res, 401, ErrorCode.UNAUTHORIZED, 'Unauthorized', null, req);

        // Authorization: Only Super Admin (UNIVERSITY scope) should be able to delete units for now?
        // Or Campus Admin for their own campus. Let's stick to ADMIN for now as per plan.
        if (user.role !== UserRole.ADMIN) {
            return sendError(res, 403, ErrorCode.FORBIDDEN, 'Forbidden: Insufficient permissions', null, req);
        }

        const result = await clearanceService.deleteClearanceUnit(unitId);
        sendSuccess(res, result);
    } catch (error: any) {
        if (error.message === 'Clearance unit not found') {
            return sendError(res, 404, ErrorCode.NOT_FOUND, error.message, null, req);
        }
        if (error.message === 'System-generated clearance units cannot be deleted') {
            return sendError(res, 400, ErrorCode.VALIDATION_ERROR, error.message, null, req);
        }
        sendError(res, 500, ErrorCode.INTERNAL_ERROR, error.message, null, req);
    }
};
