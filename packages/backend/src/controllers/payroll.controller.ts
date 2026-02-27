
import { Request, Response } from 'express';
import * as payrollService from '../services/payroll.service';
import { UserRole } from '@prisma/client';
import { z } from 'zod';
import { sendError, sendSuccess, ErrorCode } from '../utils/errorHandler';
import { getCampusScope, getCampusIdFilter } from '../lib/campusScope';

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
