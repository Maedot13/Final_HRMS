
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

        // Only HR Officers can initiate clearance
        if (user.role !== UserRole.HR_OFFICER) {
            return sendError(res, 403, ErrorCode.FORBIDDEN, 'Only HR Officers are authorised to initiate clearance', null, req);
        }

        const validation = initiateClearanceSchema.safeParse(req.body);
        if (!validation.success) return sendError(res, 400, ErrorCode.VALIDATION_ERROR, 'Invalid input', validation.error.format(), req);

        const { targetEmployeeId, reason, lastWorkingDay: lwdString } = validation.data;
        const sanitizedReason = sanitizeInput(reason);
        const lastWorkingDay = new Date(lwdString);

        // Look up the target employee by their string employeeId (e.g. EMP0001)
        const { prisma } = await import('../lib/prisma');
        const targetEmployee = await prisma.employee.findFirst({
            where: { employeeId: targetEmployeeId }
        });
        if (!targetEmployee) {
            return sendError(res, 404, ErrorCode.NOT_FOUND, `No employee found with ID "${targetEmployeeId}"`, null, req);
        }

        const result = await clearanceService.initiateClearance(targetEmployee.id, sanitizedReason, lastWorkingDay);

        await logAction({
            userId: user.userId,
            action: AuditAction.CLEARANCE_INITIATE,
            entityType: 'ClearanceRequest',
            entityId: result.id,
            changes: { targetEmployeeId, initiatedBy: user.employeeId },
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

        const privileges = user.specialPrivileges ?? [];
        const isPresident = privileges.includes('UNIVERSITY_PRESIDENT');
        
        const campusCtx = getCampusScope(req);
        const campusIdFilter = isPresident ? undefined : getCampusIdFilter(campusCtx);

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

        const privileges = req.user?.specialPrivileges ?? [];
        const isPresident = privileges.includes('UNIVERSITY_PRESIDENT');

        // Campus isolation: campus users can only view clearances in their campus
        if (!isPresident) {
            assertSameCampus(req, clearance.campusId);
        }

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

        if (![UserRole.HR_OFFICER, UserRole.FINANCE_OFFICER, UserRole.DEPARTMENT_HEAD, UserRole.CLEARANCE_BODY, UserRole.SUPER_ADMIN].includes(user.role)) {
            return sendError(res, 403, ErrorCode.FORBIDDEN, 'Forbidden', null, req);
        }

        const { getEmployeeByUserId } = await import('../services/employee.service');
        const approver = user.role !== UserRole.CLEARANCE_BODY ? await getEmployeeByUserId(user.userId) : null;
        if (user.role !== UserRole.CLEARANCE_BODY && !approver) return sendError(res, 400, ErrorCode.VALIDATION_ERROR, 'Approver profile not found', null, req);

        const sanitizedComment = comment ? sanitizeInput(comment) : undefined;

        const campusCtx = getCampusScope(req);
        const approverCampusId = campusCtx.scope === 'CAMPUS' ? campusCtx.campusId : null;

        const result = await clearanceService.approveCheck(clearanceId, unitId, approver?.id ?? null, user.userId, approverCampusId, sanitizedComment);

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

        if (![UserRole.HR_OFFICER, UserRole.FINANCE_OFFICER, UserRole.DEPARTMENT_HEAD, UserRole.CLEARANCE_BODY, UserRole.SUPER_ADMIN].includes(user.role)) {
            return sendError(res, 403, ErrorCode.FORBIDDEN, 'Forbidden', null, req);
        }

        const { getEmployeeByUserId } = await import('../services/employee.service');
        const approver = user.role !== UserRole.CLEARANCE_BODY ? await getEmployeeByUserId(user.userId) : null;
        if (user.role !== UserRole.CLEARANCE_BODY && !approver) return sendError(res, 400, ErrorCode.VALIDATION_ERROR, 'Approver profile not found', null, req);

        const sanitizedComment = sanitizeInput(comment);

        const campusCtx = getCampusScope(req);
        const approverCampusId = campusCtx.scope === 'CAMPUS' ? campusCtx.campusId : null;

        const result = await clearanceService.rejectCheck(clearanceId, unitId, approver?.id ?? null, user.userId, approverCampusId, sanitizedComment);

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

export const approveCampusHR = async (req: Request, res: Response) => {
    try {
        const clearanceId = parseInt(req.params.id);
        const user = req.user;
        if (!user) return sendError(res, 401, ErrorCode.UNAUTHORIZED, 'Unauthorized', null, req);

        // Optional notes from body
        const { notes, action } = req.body;
        const sanitizedNotes = notes ? sanitizeInput(notes) : undefined;
        // Action could be 'APPROVE' or 'REJECT'
        const isApprove = action !== 'REJECT';

        const campusCtx = getCampusScope(req);
        if (campusCtx.scope !== 'CAMPUS' || !campusCtx.campusId) {
             return sendError(res, 403, ErrorCode.FORBIDDEN, 'HR must be assigned to a specific campus to approve the campus portion', null, req);
        }

        const result = await clearanceService.approveCampusHR(clearanceId, campusCtx.campusId, user.userId, isApprove, sanitizedNotes);

        await logAction({
            userId: user.userId,
            action: isApprove ? AuditAction.CLEARANCE_APPROVE : AuditAction.CLEARANCE_REJECT,
            entityType: 'ClearanceApproval',
            entityId: clearanceId,
            changes: { status: isApprove ? 'APPROVED' : 'REJECTED', notes: sanitizedNotes },
            ipAddress: req.ip,
            userAgent: req.get('User-Agent')
        });

        sendSuccess(res, result);
    } catch (error: any) {
        if (error?.message?.includes('Forbidden') || error?.message?.includes('access denied')) return sendError(res, 403, ErrorCode.FORBIDDEN, error.message, null, req);
        sendError(res, 400, ErrorCode.INTERNAL_ERROR, error.message, null, req);
    }
};

export const finalApproveClearance = async (req: Request, res: Response) => {
    try {
        const clearanceId = parseInt(req.params.id);
        const user = req.user;
        if (!user) return sendError(res, 401, ErrorCode.UNAUTHORIZED, 'Unauthorized', null, req);

        const { action, reason } = req.body;
        const isApprove = action !== 'REJECT';
        const sanitizedReason = reason ? sanitizeInput(reason) : undefined;

        const result = await clearanceService.finalApproveClearance(clearanceId, user.userId, isApprove, sanitizedReason);

        await logAction({
            userId: user.userId,
            action: isApprove ? AuditAction.CLEARANCE_APPROVE : AuditAction.CLEARANCE_REJECT,
            entityType: 'ClearanceRequest',
            entityId: clearanceId,
            changes: { phase: 'FINAL', action: isApprove ? 'APPROVE' : 'REJECT' },
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
            return sendError(res, 400, ErrorCode.VALIDATION_ERROR, 'Invalid unit ID', null, req);
        }

        const user = req.user;
        if (!user) return sendError(res, 401, ErrorCode.UNAUTHORIZED, 'Unauthorized', null, req);

        // Authorization: Only ADMIN, DEPARTMENT_HEAD, HR_OFFICER or the unit's assigned CLEARANCE_BODY
        const isClearanceBody = user.role === 'CLEARANCE_BODY';
        if (![UserRole.ADMIN, UserRole.DEPARTMENT_HEAD, UserRole.HR_OFFICER, 'CLEARANCE_BODY'].includes(user.role)) {
            return sendError(res, 403, ErrorCode.FORBIDDEN, 'Forbidden: Insufficient permissions', null, req);
        }

        // Restrict CLEARANCE_BODY to only view their own unit
        if (isClearanceBody && (user as any).clearanceUnitId !== unitId) {
            return sendError(res, 403, ErrorCode.FORBIDDEN, 'Unauthorized: You can only view pending checks for your assigned unit', null, req);
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
        if (error?.message === 'Clearance unit not found' || error?.message === 'System-generated clearance units cannot be deleted') {
            return sendError(res, 400, ErrorCode.VALIDATION_ERROR, error.message, null, req);
        }
        sendError(res, 500, ErrorCode.INTERNAL_ERROR, error.message, null, req);
    }
};

export const listClearanceUnits = async (req: Request, res: Response) => {
    try {
        const campusCtx = getCampusScope(req);
        const campusId = campusCtx.scope === 'CAMPUS' ? campusCtx.campusId : undefined;
        
        const units = await clearanceService.listClearanceUnits(campusId);
        sendSuccess(res, units);
    } catch (error: any) {
        sendError(res, 500, ErrorCode.INTERNAL_ERROR, error.message, null, req);
    }
};

export const createClearanceUnit = async (req: Request, res: Response) => {
    try {
        const { name, fullName, description, priorityOrder, loginId, loginPassword } = req.body;
        const campusCtx = getCampusScope(req);
        
        if (campusCtx.scope !== 'CAMPUS' || !campusCtx.campusId) {
            return sendError(res, 403, ErrorCode.FORBIDDEN, 'Must be a campus admin to create clearance units', null, req);
        }

        if (!name) return sendError(res, 400, ErrorCode.VALIDATION_ERROR, 'Name is required', null, req);

        if (!loginId || !loginPassword) {
             return sendError(res, 400, ErrorCode.VALIDATION_ERROR, 'Login ID and Password strictly required for new bodies', null, req);
        }

        const unit = await clearanceService.createClearanceUnit({
            name,
            fullName,
            description,
            campusId: campusCtx.campusId,
            priorityOrder: priorityOrder ? parseInt(priorityOrder) : 0,
            loginId,
            loginPassword
        });
        
        sendSuccess(res, unit, 201);
    } catch (error: any) {
        const status = error.message.includes('Unique constraint failed') ? 409 : 500;
        sendError(res, status, ErrorCode.INTERNAL_ERROR, error.message, null, req);
    }
};

export const updateClearanceUnit = async (req: Request, res: Response) => {
    try {
        const id = parseInt(req.params.unitId);
        const { name, fullName, description, isActive, priorityOrder } = req.body;
        
        const unit = await clearanceService.updateClearanceUnit(id, { 
            name, 
            fullName, 
            description, 
            isActive, 
            priorityOrder: priorityOrder !== undefined ? parseInt(priorityOrder) : undefined 
        });
        sendSuccess(res, unit);
    } catch (error: any) {
        const status = error.message.includes('not found') || error.message.includes('Cannot rename') ? 400 : 500;
        sendError(res, status, ErrorCode.INTERNAL_ERROR, error.message, null, req);
    }
};
