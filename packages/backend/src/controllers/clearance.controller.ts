
import { Request, Response } from 'express';
import * as clearanceService from '../services/clearance.service';
import { UserRole } from '@hrms/types';
import { z } from 'zod';
import { sanitizeInput } from '../utils/sanitize';

const initiateSchema = z.object({
    reason: z.string().min(5, 'Reason must be at least 5 characters'),
    lastWorkingDay: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/))
});

import { AuditAction } from '@prisma/client';
import { logAction } from '../services/auditLog.service';
import { sendError, sendSuccess, ErrorCode } from '../utils/errorHandler';

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

        const validation = initiateSchema.safeParse(req.body);
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

        sendSuccess(res, clearance);
    } catch (error: any) {
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

        const result = await clearanceService.approveCheck(clearanceId, unitId, approver.id, sanitizedComment);

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
        sendError(res, 400, ErrorCode.INTERNAL_ERROR, error.message, null, req);
    }
};

export const rejectCheck = async (req: Request, res: Response) => {
    try {
        const clearanceId = parseInt(req.params.id);
        const user = req.user;
        if (!user) return sendError(res, 401, ErrorCode.UNAUTHORIZED, 'Unauthorized', null, req);

        const validation = approveCheckSchema.safeParse(req.body);
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

        const result = await clearanceService.rejectCheck(clearanceId, unitId, approver.id, sanitizedComment);

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
        sendError(res, 400, ErrorCode.INTERNAL_ERROR, error.message, null, req);
    }
};

// Get pending checks for a specific unit (for approver dashboard)
export const getPendingChecksForUnit = async (req: Request, res: Response) => {
    try {
        const unitId = parseInt(req.params.unitId);
        if (isNaN(unitId)) {
            return res.status(400).json({ message: 'Invalid unit ID' });
        }

        const user = req.user;
        if (!user) return res.status(401).json({ message: 'Unauthorized' });

        // Authorization: Only ADMIN, DEPARTMENT_HEAD, or HR_OFFICER can view pending checks
        if (![UserRole.ADMIN, UserRole.DEPARTMENT_HEAD, UserRole.HR_OFFICER].includes(user.role)) {
            return res.status(403).json({ message: 'Forbidden: Insufficient permissions' });
        }

        const pendingChecks = await clearanceService.getPendingChecksForUnit(unitId);
        res.json(pendingChecks);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};
