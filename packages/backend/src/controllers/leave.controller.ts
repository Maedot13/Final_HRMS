import { Request, Response } from 'express';
import * as leaveService from '../services/leave.service';
import { UserRole } from '@hrms/types';
import { z } from 'zod';
import { LeaveType } from '@prisma/client';
import { sendError, sendSuccess, ErrorCode } from '../utils/errorHandler';

const createLeaveSchema = z.object({
    leaveType: z.nativeEnum(LeaveType),
    startDate: z.string().datetime(), // Expect ISO string
    endDate: z.string().datetime(),
    reason: z.string().min(1),
    attachmentUrl: z.string().optional()
});

import { AuditAction } from '@prisma/client';
import { logAction } from '../services/auditLog.service';

export const createLeaveRequest = async (req: Request, res: Response) => {
    try {
        const user = req.user;
        if (!user || !user.employeeId) {
            return sendError(res, 401, ErrorCode.UNAUTHORIZED, 'Unauthorized', null, req);
        }

        const employee = req.employee;
        if (!employee) {
            return sendError(res, 404, ErrorCode.NOT_FOUND, 'Employee profile not found', null, req);
        }

        const attachmentUrl = req.file ? `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}` : req.body.attachmentUrl;

        const request = await leaveService.createLeaveRequest(employee.id, {
            ...req.body,
            attachmentUrl
        });

        await logAction({
            userId: user.userId,
            action: AuditAction.LEAVE_REQUEST_CREATE,
            entityType: 'LeaveRequest',
            entityId: request.id,
            ipAddress: req.ip,
            userAgent: req.get('User-Agent')
        });

        sendSuccess(res, request, 201);
    } catch (error: any) {
        sendError(res, 400, ErrorCode.INTERNAL_ERROR, error.message, null, req);
    }
};

export const getMyRequests = async (req: Request, res: Response) => {
    try {
        const user = req.user;
        if (!user) {
            return sendError(res, 401, ErrorCode.UNAUTHORIZED, 'Unauthorized', null, req);
        }

        const employee = req.employee;
        if (!employee) {
            return sendError(res, 404, ErrorCode.NOT_FOUND, 'Employee profile not found', null, req);
        }

        const requests = await leaveService.getEmployeeRequests(employee.id);
        sendSuccess(res, requests);
    } catch (error: any) {
        sendError(res, 500, ErrorCode.INTERNAL_ERROR, error.message, null, req);
    }
};

export const getPendingRequests = async (req: Request, res: Response) => {
    try {
        const user = req.user;
        if (!user) {
            return sendError(res, 401, ErrorCode.UNAUTHORIZED, 'Unauthorized', null, req);
        }

        if (user.role !== UserRole.DEPARTMENT_HEAD && user.role !== UserRole.HR_OFFICER && user.role !== UserRole.ADMIN) {
            return sendError(res, 403, ErrorCode.FORBIDDEN, 'Forbidden', null, req);
        }

        const requests = await leaveService.getPendingRequests();
        sendSuccess(res, requests);
    } catch (error: any) {
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
        if (user.role !== UserRole.DEPARTMENT_HEAD) {
            return sendError(res, 403, ErrorCode.FORBIDDEN, 'Forbidden', null, req);
        }

        const approver = req.employee;
        if (!approver) {
            return sendError(res, 400, ErrorCode.VALIDATION_ERROR, 'Approver profile not found', null, req);
        }

        const result = await leaveService.approveRequest(id, approver.id, comment);

        await logAction({
            userId: user.userId,
            action: AuditAction.LEAVE_REQUEST_APPROVE,
            entityType: 'LeaveRequest',
            entityId: result.id,
            changes: { status: 'APPROVED', comment },
            ipAddress: req.ip,
            userAgent: req.get('User-Agent')
        });

        sendSuccess(res, result);
    } catch (error: any) {
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
        if (user.role !== UserRole.DEPARTMENT_HEAD) {
            return sendError(res, 403, ErrorCode.FORBIDDEN, 'Only Department Head can reject leave requests', null, req);
        }

        const approver = req.employee;
        if (!approver) {
            return sendError(res, 400, ErrorCode.VALIDATION_ERROR, 'Approver profile not found', null, req);
        }

        const result = await leaveService.rejectRequest(id, approver.id, comment);

        await logAction({
            userId: user.userId,
            action: AuditAction.LEAVE_REQUEST_REJECT,
            entityType: 'LeaveRequest',
            entityId: result.id,
            changes: { status: 'REJECTED', comment },
            ipAddress: req.ip,
            userAgent: req.get('User-Agent')
        });

        sendSuccess(res, result);
    } catch (error: any) {
        sendError(res, 400, ErrorCode.INTERNAL_ERROR, error.message, null, req);
    }
};
