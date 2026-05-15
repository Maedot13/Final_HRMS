
import { Request, Response } from 'express';
import * as sabbaticalService from '../services/sabbatical.service';
import { UserRole } from '@hrms/types';
import { z } from 'zod';
import { sendError, sendSuccess, ErrorCode } from '../utils/errorHandler';
import { getCampusScope, getCampusIdFilter } from '../lib/campusScope';

const createSabbaticalSchema = z.object({
    purpose: z.string().min(10),
    startDate: z.string().datetime(),
    endDate: z.string().datetime(),
    plan: z.string().min(20),
    planDocumentUrl: z.string().url().optional()
});

import { AuditAction } from '@prisma/client';
import { logAction } from '../services/auditLog.service';

export const createSabbatical = async (req: Request, res: Response) => {
    try {
        const user = req.user;
        if (!user || !user.employeeId) {
            return sendError(res, 401, ErrorCode.UNAUTHORIZED, 'Unauthorized', null, req);
        }

        const employee = req.employee;
        if (!employee) {
            return sendError(res, 404, ErrorCode.NOT_FOUND, 'Employee profile not found', null, req);
        }

        const planDocumentUrl = req.file ? `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}` : req.body.planDocumentUrl;

        // req.body is already validated by middleware
        const request = await sabbaticalService.createSabbaticalRequest(employee.id, {
            ...req.body,
            planDocumentUrl
        });

        await logAction({
            userId: user.userId,
            action: AuditAction.SABBATICAL_REQUEST_CREATE,
            entityType: 'SabbaticalRequest',
            entityId: request.id,
            ipAddress: req.ip,
            userAgent: req.get('User-Agent')
        });

        sendSuccess(res, request, 201);
    } catch (error: any) {
        sendError(res, 400, ErrorCode.INTERNAL_ERROR, error.message, null, req);
    }
};

export const getRequests = async (req: Request, res: Response) => {
    try {
        const user = req.user;
        if (!user) {
            return sendError(res, 401, ErrorCode.UNAUTHORIZED, 'Unauthorized', null, req);
        }

        const employee = req.employee;
        if (!employee) {
            return sendError(res, 404, ErrorCode.NOT_FOUND, 'Employee profile not found', null, req);
        }

        // If employee, see own. If HR/Admin/Head, see all (or filtered, simplified to all for now)
        const privileges = user.specialPrivileges ?? [];
        const isDean = privileges.includes('DEAN');
        const isPrivileged = [UserRole.ADMIN, UserRole.HR_OFFICER, UserRole.DEPARTMENT_HEAD].includes(user.role) || isDean;

        const campusCtx = getCampusScope(req);
        const campusIdFilter = getCampusIdFilter(campusCtx);

        const requests = await sabbaticalService.getSabbaticalRequests(
            isPrivileged ? undefined : employee.id,
            isPrivileged ? campusIdFilter : undefined
        );
        sendSuccess(res, requests);
    } catch (error: any) {
        if (error?.message === 'Missing campus context for this user') {
            return sendError(res, 403, ErrorCode.FORBIDDEN, 'Forbidden', null, req);
        }
        sendError(res, 500, ErrorCode.INTERNAL_ERROR, error.message, null, req);
    }
};

export const approveRequest = async (req: Request, res: Response) => {
    try {
        const id = parseInt(req.params.id);
        const { comment } = req.body;
        const user = req.user;

        if (!user) {
            return sendError(res, 401, ErrorCode.UNAUTHORIZED, 'Unauthorized', null, req);
        }

        const privileges = user.specialPrivileges ?? [];
        const isDean = privileges.includes('DEAN');

        // Only Dept Head or HR or Admin or Dean can approve  
        if (![UserRole.DEPARTMENT_HEAD, UserRole.HR_OFFICER, UserRole.ADMIN].includes(user.role) && !isDean) {
            return sendError(res, 403, ErrorCode.FORBIDDEN, 'Forbidden', null, req);
        }

        const approver = req.employee;
        if (!approver) {
            return sendError(res, 400, ErrorCode.VALIDATION_ERROR, 'Approver profile not found', null, req);
        }

        const campusCtx = getCampusScope(req);
        const approverCampusId = campusCtx.scope === 'CAMPUS' ? campusCtx.campusId : null;

        const result = await sabbaticalService.approveSabbatical(id, approver.id, approverCampusId, comment);

        await logAction({
            userId: user.userId,
            action: AuditAction.SABBATICAL_APPROVE,
            entityType: 'SabbaticalRequest',
            entityId: result.id,
            changes: { status: 'APPROVED', comment }, // Store outcome in changes
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

export const rejectRequest = async (req: Request, res: Response) => {
    try {
        const id = parseInt(req.params.id);
        const { comment } = req.body;
        const user = req.user;
        if (!user) {
            return sendError(res, 401, ErrorCode.UNAUTHORIZED, 'Unauthorized', null, req);
        }

        if (!comment || comment.trim().length < 5) {
            return sendError(res, 400, ErrorCode.VALIDATION_ERROR, 'Rejection requires a comment (min 5 characters)', null, req);
        }

        const privileges = user.specialPrivileges ?? [];
        const isDean = privileges.includes('DEAN');

        if (![UserRole.DEPARTMENT_HEAD, UserRole.HR_OFFICER, UserRole.ADMIN].includes(user.role) && !isDean) {
            return sendError(res, 403, ErrorCode.FORBIDDEN, 'Forbidden', null, req);
        }

        const approver = req.employee;
        if (!approver) {
            return sendError(res, 400, ErrorCode.VALIDATION_ERROR, 'Approver profile not found', null, req);
        }

        const campusCtx = getCampusScope(req);
        const approverCampusId = campusCtx.scope === 'CAMPUS' ? campusCtx.campusId : null;

        const result = await sabbaticalService.rejectSabbatical(id, approver.id, approverCampusId, comment);

        await logAction({
            userId: user.userId,
            action: AuditAction.SABBATICAL_REJECT,
            entityType: 'SabbaticalRequest',
            entityId: result.id,
            changes: { status: 'REJECTED', comment },
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
