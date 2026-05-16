import { Request, Response } from 'express';
import * as payrollService from '../services/payroll.service';
import * as payrollReportService from '../services/payrollReport.service';
import { UserRole } from '@prisma/client';
import { z } from 'zod';
import { sendError, sendSuccess, ErrorCode } from '../utils/errorHandler';
import { getCampusScope, getCampusIdFilter } from '../lib/campusScope';
import fs from 'fs';

const payrollParamsSchema = z.object({
    month: z.coerce.number().int().min(1).max(12).optional(),
    year: z.coerce.number().int().min(2000).max(2100).optional()
});

export const getPayrollData = async (req: Request, res: Response) => {
    try {
        const user = req.user;
        if (!user) return sendError(res, 401, ErrorCode.UNAUTHORIZED, 'Unauthorized', null, req);

        // Access Control: HR, Finance, Admin
        const allowedRoles: UserRole[] = [UserRole.HR_OFFICER, UserRole.ADMIN, UserRole.FINANCE_OFFICER];
        if (!allowedRoles.includes(user.role)) {
            return sendError(res, 403, ErrorCode.FORBIDDEN, 'Forbidden: Insufficient permissions', null, req);
        }

        const validation = payrollParamsSchema.safeParse(req.query);
        if (!validation.success) {
            return sendError(res, 400, ErrorCode.VALIDATION_ERROR, 'Invalid parameters', validation.error.format(), req);
        }

        const { month, year } = validation.data;
        const campusCtx = getCampusScope(req);
        const campusId = getCampusIdFilter(campusCtx);
        const result = await payrollService.getPayrollData({ month, year, campusId });
        sendSuccess(res, result);
    } catch (error: any) {
        if (error?.message === 'Missing campus context for this user') {
            return sendError(res, 403, ErrorCode.FORBIDDEN, 'Forbidden', null, req);
        }
        sendError(res, 500, ErrorCode.INTERNAL_ERROR, error.message, null, req);
    }
};

export const generatePayrollExcel = async (req: Request, res: Response) => {
    try {
        const user = req.user;
        if (!user) return sendError(res, 401, ErrorCode.UNAUTHORIZED, 'Unauthorized', null, req);

        const validation = payrollParamsSchema.safeParse(req.query);
        if (!validation.success) {
            return sendError(res, 400, ErrorCode.VALIDATION_ERROR, 'Invalid parameters', validation.error.format(), req);
        }

        const { month, year } = validation.data;
        const campusCtx = getCampusScope(req);
        const campusId = getCampusIdFilter(campusCtx);
        
        const result = await payrollService.getPayrollData({ month, year, campusId });
        const buffer = payrollReportService.generateExcelBuffer(result.data);

        const filename = `payroll_${year || new Date().getFullYear()}_${month || new Date().getMonth() + 1}.xlsx`;

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
        res.send(buffer);
    } catch (error: any) {
        sendError(res, 500, ErrorCode.INTERNAL_ERROR, error.message, null, req);
    }
};

export const sendToFinance = async (req: Request, res: Response) => {
    try {
        const user = req.user;
        if (!user) return sendError(res, 401, ErrorCode.UNAUTHORIZED, 'Unauthorized', null, req);

        // Required for this action
        const validation = z.object({
            month: z.coerce.number().int().min(1).max(12),
            year: z.coerce.number().int().min(2000).max(2100)
        }).safeParse(req.body);

        if (!validation.success) {
            return sendError(res, 400, ErrorCode.VALIDATION_ERROR, 'Missing month or year', validation.error.format(), req);
        }

        const { month, year } = validation.data;
        const campusCtx = getCampusScope(req);
        const campusId = getCampusIdFilter(campusCtx);

        if (!campusId) {
            return sendError(res, 400, ErrorCode.BAD_REQUEST, 'Campus ID is required for sending report', null, req);
        }

        const report = await payrollReportService.sendToFinance({
            month,
            year,
            campusId,
            userId: user.userId
        });

        sendSuccess(res, report, 201);
    } catch (error: any) {
        sendError(res, 500, ErrorCode.INTERNAL_ERROR, error.message, null, req);
    }
};

export const listReports = async (req: Request, res: Response) => {
    try {
        const campusCtx = getCampusScope(req);
        const campusId = getCampusIdFilter(campusCtx);

        if (!campusId) {
            return sendError(res, 400, ErrorCode.BAD_REQUEST, 'Campus ID context missing', null, req);
        }

        const reports = await payrollReportService.listReports(campusId);
        sendSuccess(res, reports);
    } catch (error: any) {
        sendError(res, 500, ErrorCode.INTERNAL_ERROR, error.message, null, req);
    }
};

export const downloadReport = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const report = await payrollReportService.getReportById(Number(id));

        if (!report) {
            return sendError(res, 404, ErrorCode.NOT_FOUND, 'Report not found', null, req);
        }

        // Authorization check: User must be from the same campus or a University admin
        const user = req.user;
        if (user?.scope !== 'UNIVERSITY' && user?.campusId !== report.campusId) {
            return sendError(res, 403, ErrorCode.FORBIDDEN, 'Access denied to this report', null, req);
        }

        const filePath = payrollReportService.getAbsoluteFilePath(report.reportUrl);

        if (!fs.existsSync(filePath)) {
            return sendError(res, 404, ErrorCode.NOT_FOUND, 'Report file not found on disk', null, req);
        }

        res.download(filePath, `Payroll_Report_${report.month}_${report.year}.xlsx`);
    } catch (error: any) {
        sendError(res, 500, ErrorCode.INTERNAL_ERROR, error.message, null, req);
    }
};

/**
 * Finance Officer: view leave-based payroll notifications with full leave + salary info.
 */
export const getLeaveTransfers = async (req: Request, res: Response) => {
    try {
        const user = req.user;
        if (!user) return sendError(res, 401, ErrorCode.UNAUTHORIZED, 'Unauthorized', null, req);

        const allowedRoles: UserRole[] = [UserRole.FINANCE_OFFICER, UserRole.HR_OFFICER, UserRole.ADMIN];
        if (!allowedRoles.includes(user.role)) {
            return sendError(res, 403, ErrorCode.FORBIDDEN, 'Forbidden', null, req);
        }

        const campusCtx = getCampusScope(req);
        const campusId = getCampusIdFilter(campusCtx) ?? undefined;

        const data = await payrollService.getLeavePayrollTransfers(campusId);
        sendSuccess(res, data);
    } catch (error: any) {
        sendError(res, 500, ErrorCode.INTERNAL_ERROR, error.message, null, req);
    }
};

