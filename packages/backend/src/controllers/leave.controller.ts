import { Request, Response } from 'express';
import * as leaveService from '../services/leave.service';
import { UserRole } from '@hrms/types';
import { sendError, sendSuccess, ErrorCode } from '../utils/errorHandler';
import { prisma } from '../lib/prisma';
import { AuditAction } from '@prisma/client';
import { logAction } from '../services/auditLog.service';
import { upload } from '../middleware/upload.middleware';
import { assertSameCampus } from '../lib/campusScope';
import { uploadToCloudinary } from '../utils/cloudinary';
import { logger } from '../utils/logger';
import fs from 'fs/promises';

// ─── Employee: Apply for Leave ────────────────────────────────────────────────

export const createLeaveRequest = async (req: Request, res: Response) => {
    try {
        const user = req.user;
        if (!user?.employeeId) {
            return sendError(res, 401, ErrorCode.UNAUTHORIZED, 'Unauthorized', null, req);
        }
        const employee = req.employee;
        if (!employee) {
            return sendError(res, 404, ErrorCode.NOT_FOUND, 'Employee profile not found', null, req);
        }

        let attachmentUrl = req.body.attachmentUrl;
        let attachmentMetadata = undefined;

        if (req.file) {
            try {
                const uploadResult = await uploadToCloudinary(
                    req.file.path,
                    req.file.originalname,
                    req.file.mimetype,
                    user.userId
                );
                
                // If it emulated local storage, let's construct the full local URL
                if (uploadResult.secure_url.startsWith('/uploads/')) {
                    attachmentUrl = `${req.protocol}://${req.get('host')}${uploadResult.secure_url}`;
                } else {
                    attachmentUrl = uploadResult.secure_url;
                    // Delete local file since it was successfully uploaded to Cloudinary
                    try {
                        await fs.unlink(req.file.path);
                    } catch (cleanupError) {
                        logger.error('Failed to delete temp file after Cloudinary upload:', cleanupError);
                    }
                }

                attachmentMetadata = {
                    userId: user.userId,
                    fileName: req.file.originalname,
                    fileType: req.file.mimetype,
                    publicId: uploadResult.public_id,
                };
            } catch (uploadError: any) {
                logger.error('Document upload failed:', uploadError);
                return sendError(res, 500, ErrorCode.INTERNAL_ERROR, 'Supporting document upload failed: ' + uploadError.message, null, req);
            }
        }

        const request = await leaveService.createLeaveRequest(employee.id, {
            ...req.body,
            attachmentUrl,
            attachmentMetadata,
        });

        await logAction({
            userId: user.userId,
            action: AuditAction.LEAVE_REQUEST_CREATE,
            entityType: 'LeaveRequest',
            entityId: request.id,
            ipAddress: req.ip,
            userAgent: req.get('User-Agent'),
        });

        return sendSuccess(res, request, 201);
    } catch (error: any) {
        // Business logic errors from the service are already user-friendly.
        // Log the full error for debugging, then return an appropriate status.
        const message = error?.message || 'Leave request creation failed';
        const isPrismaInternal = message.includes('prisma') || message.includes('database') || message.includes('migration');

        if (isPrismaInternal) {
            logger.error('Leave request creation failed with infrastructure error', { error: message, stack: error?.stack });
            return sendError(res, 500, ErrorCode.INTERNAL_ERROR, message, null, req);
        }

        return sendError(res, 400, ErrorCode.VALIDATION_ERROR, message, null, req);
    }
};

// ─── Employee: My Leave Requests ──────────────────────────────────────────────

export const getMyRequests = async (req: Request, res: Response) => {
    try {
        const employee = req.employee;
        if (!employee) {
            return sendError(res, 404, ErrorCode.NOT_FOUND, 'Employee profile not found', null, req);
        }
        const requests = await leaveService.getEmployeeRequests(employee.id);
        return sendSuccess(res, requests);
    } catch (error: any) {
        return sendError(res, 500, ErrorCode.INTERNAL_ERROR, error.message, null, req);
    }
};

// ─── Role-aware: Get Pending Requests ────────────────────────────────────────

export const getPendingRequests = async (req: Request, res: Response) => {
    try {
        const user = req.user;
        if (!user) return sendError(res, 401, ErrorCode.UNAUTHORIZED, 'Unauthorized', null, req);

        const employee = req.employee;
        const privileges: string[] = user.specialPrivileges ?? [];

        let requests: any[];

        if (user.role === UserRole.DEPARTMENT_HEAD) {
            // Dept heads see only their department's pending (DEPT_HEAD stage)
            const deptId = employee?.departmentId ?? null;
            requests = await leaveService.getDeptHeadPending(deptId);

        } else if (user.role === UserRole.HR_OFFICER || user.role === UserRole.ADMIN) {
            // HR Officers see requests forwarded to HR stage on their campus
            // They also have access to ALL campus requests for record-keeping
            const viewAll = req.query.view === 'all';
            if (viewAll) {
                requests = await leaveService.getAllCampusRequests(user.campusId ?? null);
            } else {
                requests = await leaveService.getHROfficerPending(user.campusId ?? null);
            }

        } else if (privileges.includes('DEAN')) {
            requests = await leaveService.getDeanPending(user.campusId ?? null);

        } else if (privileges.includes('VICE_PRESIDENT') || privileges.includes('UNIVERSITY_PRESIDENT')) {
            requests = await leaveService.getVPPending();

        } else {
            return sendError(res, 403, ErrorCode.FORBIDDEN, 'Insufficient permissions to view pending requests', null, req);
        }

        return sendSuccess(res, requests);
    } catch (error: any) {
        return sendError(res, 500, ErrorCode.INTERNAL_ERROR, error.message, null, req);
    }
};

// ─── Department Head: Review (Approve/Reject) a Request ───────────────────────

export const deptHeadReview = async (req: Request, res: Response) => {
    try {
        const id = parseInt(req.params.id);
        const user = req.user;
        const employee = req.employee;

        if (!user) return sendError(res, 401, ErrorCode.UNAUTHORIZED, 'Unauthorized', null, req);
        if (user.role !== UserRole.DEPARTMENT_HEAD) {
            return sendError(res, 403, ErrorCode.FORBIDDEN, 'Only department heads can perform this action', null, req);
        }
        if (!employee) {
            return sendError(res, 400, ErrorCode.VALIDATION_ERROR, 'Department head employee profile not found', null, req);
        }

        const { decision, comment } = req.body;
        if (!decision || !['APPROVED', 'REJECTED'].includes(decision)) {
            return sendError(res, 400, ErrorCode.VALIDATION_ERROR, 'decision must be APPROVED or REJECTED', null, req);
        }
        if (decision === 'REJECTED' && !comment?.trim()) {
            return sendError(res, 400, ErrorCode.VALIDATION_ERROR, 'A rejection reason (comment) is required', null, req);
        }

        const result = await leaveService.deptHeadReview(
            id,
            user.userId,
            employee.departmentId ?? null,
            { decision, comment }
        );

        await logAction({
            userId: user.userId,
            action: decision === 'APPROVED' ? AuditAction.LEAVE_REQUEST_APPROVE : AuditAction.LEAVE_REQUEST_REJECT,
            entityType: 'LeaveRequest',
            entityId: id,
            changes: { stage: 'DEPT_HEAD', decision, comment },
            ipAddress: req.ip,
            userAgent: req.get('User-Agent'),
        });

        return sendSuccess(res, result);
    } catch (error: any) {
        if (error?.message?.includes('campus') || error?.message?.includes('department')) {
            return sendError(res, 403, ErrorCode.FORBIDDEN, error.message, null, req);
        }
        return sendError(res, 400, ErrorCode.INTERNAL_ERROR, error.message, null, req);
    }
};

// ─── Final Approver: Approve ──────────────────────────────────────────────────

export const approveRequest = async (req: Request, res: Response) => {
    try {
        const id = parseInt(req.params.id);
        const { comment } = req.body;
        const user = req.user;

        if (!user) return sendError(res, 401, ErrorCode.UNAUTHORIZED, 'Unauthorized', null, req);

        const privileges: string[] = user.specialPrivileges ?? [];
        const isFinalApprover =
            user.role === UserRole.HR_OFFICER ||
            user.role === UserRole.ADMIN ||
            privileges.includes('DEAN') ||
            privileges.includes('VICE_PRESIDENT') ||
            privileges.includes('UNIVERSITY_PRESIDENT');

        if (!isFinalApprover) {
            return sendError(res, 403, ErrorCode.FORBIDDEN, 'Insufficient permissions to approve leave', null, req);
        }

        const result = await leaveService.finalDecision(
            id,
            user.userId,
            user.campusId ?? null,
            privileges,
            user.role,
            'APPROVED',
            comment
        );

        await logAction({
            userId: user.userId,
            action: AuditAction.LEAVE_REQUEST_APPROVE,
            entityType: 'LeaveRequest',
            entityId: id,
            changes: { status: result.status, stage: result.currentStage, comment },
            ipAddress: req.ip,
            userAgent: req.get('User-Agent'),
        });

        return sendSuccess(res, result);
    } catch (error: any) {
        if (error?.message?.includes('denied') || error?.message?.includes('Only')) {
            return sendError(res, 403, ErrorCode.FORBIDDEN, error.message, null, req);
        }
        return sendError(res, 400, ErrorCode.INTERNAL_ERROR, error.message, null, req);
    }
};

// ─── Final Approver: Reject ───────────────────────────────────────────────────

export const rejectRequest = async (req: Request, res: Response) => {
    try {
        const id = parseInt(req.params.id);
        const { comment } = req.body;
        const user = req.user;

        if (!user) return sendError(res, 401, ErrorCode.UNAUTHORIZED, 'Unauthorized', null, req);
        if (!comment?.trim()) {
            return sendError(res, 400, ErrorCode.VALIDATION_ERROR, 'Rejection reason is required', null, req);
        }

        const privileges: string[] = user.specialPrivileges ?? [];
        const isFinalApprover =
            user.role === UserRole.HR_OFFICER ||
            user.role === UserRole.ADMIN ||
            privileges.includes('DEAN') ||
            privileges.includes('VICE_PRESIDENT') ||
            privileges.includes('UNIVERSITY_PRESIDENT');

        if (!isFinalApprover) {
            return sendError(res, 403, ErrorCode.FORBIDDEN, 'Insufficient permissions to reject leave', null, req);
        }

        const result = await leaveService.finalDecision(
            id,
            user.userId,
            user.campusId ?? null,
            privileges,
            user.role,
            'REJECTED',
            comment
        );

        await logAction({
            userId: user.userId,
            action: AuditAction.LEAVE_REQUEST_REJECT,
            entityType: 'LeaveRequest',
            entityId: id,
            changes: { status: 'REJECTED', comment },
            ipAddress: req.ip,
            userAgent: req.get('User-Agent'),
        });

        return sendSuccess(res, result);
    } catch (error: any) {
        if (error?.message?.includes('denied') || error?.message?.includes('Only')) {
            return sendError(res, 403, ErrorCode.FORBIDDEN, error.message, null, req);
        }
        return sendError(res, 400, ErrorCode.INTERNAL_ERROR, error.message, null, req);
    }
};

// ─── View single request ──────────────────────────────────────────────────────

export const getLeaveRequest = async (req: Request, res: Response) => {
    try {
        const id = parseInt(req.params.id);
        const user = req.user;
        if (!user) return sendError(res, 401, ErrorCode.UNAUTHORIZED, 'Unauthorized', null, req);

        const request = await leaveService.getLeaveRequestById(id);
        if (!request) {
            return sendError(res, 404, ErrorCode.NOT_FOUND, 'Leave request not found', null, req);
        }

        const privileges: string[] = user.specialPrivileges ?? [];
        const canView =
            request.employeeId === user.employeePkId ||
            user.role === UserRole.HR_OFFICER ||
            user.role === UserRole.ADMIN ||
            user.role === UserRole.DEPARTMENT_HEAD ||
            privileges.includes('DEAN') ||
            privileges.includes('VICE_PRESIDENT') ||
            privileges.includes('UNIVERSITY_PRESIDENT');

        if (!canView) {
            return sendError(res, 403, ErrorCode.FORBIDDEN, 'Forbidden', null, req);
        }

        const isSystemWide = privileges.includes('UNIVERSITY_PRESIDENT') || privileges.includes('VICE_PRESIDENT');
        if (request.employeeId !== user.employeePkId && !isSystemWide) {
            assertSameCampus(req, request.campusId);
        }

        return sendSuccess(res, request);
    } catch (error: any) {
        return sendError(res, 500, ErrorCode.INTERNAL_ERROR, error.message, null, req);
    }
};

// ─── Leave Balances ───────────────────────────────────────────────────────────

export const getLeaveBalances = async (req: Request, res: Response) => {
    try {
        const employeeId = parseInt(req.params.employeeId);
        const user = req.user;
        const year = parseInt(req.query.year as string) || new Date().getFullYear();

        if (!user) return sendError(res, 401, ErrorCode.UNAUTHORIZED, 'Unauthorized', null, req);

        const targetEmployee = await prisma.employee.findUnique({
            where: { id: employeeId },
            select: { campusId: true, userId: true },
        });
        if (!targetEmployee) {
            return sendError(res, 404, ErrorCode.NOT_FOUND, 'Employee not found', null, req);
        }

        const isSelf = targetEmployee.userId === user.userId;
        const isAuthorized =
            isSelf ||
            user.role === UserRole.HR_OFFICER ||
            user.role === UserRole.ADMIN ||
            user.role === UserRole.DEPARTMENT_HEAD;

        if (!isAuthorized) {
            return sendError(res, 403, ErrorCode.FORBIDDEN, 'Forbidden', null, req);
        }

        const balance = await leaveService.getLeaveBalances(employeeId, year);
        return sendSuccess(res, balance || {
            annualBalance: 0,
            sickBalance: 0,
            maternityBalance: 0,
            paternityBalance: 0,
            personalBalance: 0,
            year,
        });
    } catch (error: any) {
        return sendError(res, 500, ErrorCode.INTERNAL_ERROR, error.message, null, req);
    }
};

export const getMyLeaveBalance = async (req: Request, res: Response) => {
    try {
        const employee = req.employee!;
        const year = new Date().getFullYear();
        const balance = await leaveService.getLeaveBalances(employee.id, year);
        return sendSuccess(res, balance || {
            annualBalance: 0,
            sickBalance: 0,
            maternityBalance: 0,
            paternityBalance: 0,
            personalBalance: 0,
            year,
        });
    } catch (error: any) {
        return sendError(res, 500, ErrorCode.INTERNAL_ERROR, error.message, null, req);
    }
};

// ─── HR: All campus requests (record-keeping) ─────────────────────────────────

export const getAllCampusRequests = async (req: Request, res: Response) => {
    try {
        const user = req.user;
        if (!user) return sendError(res, 401, ErrorCode.UNAUTHORIZED, 'Unauthorized', null, req);
        if (user.role !== UserRole.HR_OFFICER && user.role !== UserRole.ADMIN) {
            return sendError(res, 403, ErrorCode.FORBIDDEN, 'HR Officer access required', null, req);
        }
        const requests = await leaveService.getAllCampusRequests(user.campusId ?? null);
        return sendSuccess(res, requests);
    } catch (error: any) {
        return sendError(res, 500, ErrorCode.INTERNAL_ERROR, error.message, null, req);
    }
};
