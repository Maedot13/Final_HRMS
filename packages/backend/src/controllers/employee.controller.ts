import { Request, Response } from 'express';
import * as employeeService from '../services/employee.service';
import { UserRole } from '@hrms/types';
import { sendError, sendSuccess, ErrorCode } from '../utils/errorHandler';
import { auditEmployeeUpdate, AuditAction } from '../utils/auditLog';
import { assertSameCampus, assertCanWriteCampusResource } from '../lib/campusScope';

export const getEmployee = async (req: Request, res: Response) => {
    try {
        const id = parseInt(req.params.id);
        const user = req.user;

        if (isNaN(id)) {
            return sendError(
                res,
                400,
                ErrorCode.VALIDATION_ERROR,
                'Invalid employee ID. Please provide a numeric database ID.',
                null,
                req
            );
        }

        if (!user) {
            return sendError(
                res,
                401,
                ErrorCode.AUTHENTICATION_FAILED,
                'Unauthorized',
                null,
                req
            );
        }

        // Fetch employee
        const employee = await employeeService.getEmployeeById(id);

        if (!employee) {
            return sendError(
                res,
                404,
                ErrorCode.NOT_FOUND,
                'Employee not found',
                null,
                req
            );
        }

        // Authorization:
        // 1. Admin/HR can view anyone
        // 2. Employee can view themselves
        const isSelf = employee.userId === user.userId;
        const isAdminOrHR = user.role === UserRole.ADMIN || user.role === UserRole.HR_OFFICER;

        if (!isSelf && !isAdminOrHR) {
            return sendError(
                res,
                403,
                ErrorCode.FORBIDDEN,
                'Forbidden',
                null,
                req
            );
        }

        // Campus isolation: campus users can only view employees in their campus
        assertSameCampus(req, employee.campusId);

        sendSuccess(res, employee);
    } catch (error: any) {
        if (error?.message === 'Cross-campus access denied' || error?.message === 'Missing campus context for this user') {
            return sendError(res, 403, ErrorCode.FORBIDDEN, 'Forbidden', null, req);
        }
        sendError(
            res,
            500,
            ErrorCode.INTERNAL_ERROR,
            error.message,
            null,
            req
        );
    }
};

export const updateEmployee = async (req: Request, res: Response) => {
    try {
        const id = parseInt(req.params.id);
        const user = req.user;
        const data = req.body;

        if (isNaN(id)) {
            return sendError(
                res,
                400,
                ErrorCode.VALIDATION_ERROR,
                'Invalid employee ID. Please provide a numeric database ID.',
                null,
                req
            );
        }

        if (!user) {
            return sendError(
                res,
                401,
                ErrorCode.AUTHENTICATION_FAILED,
                'Unauthorized',
                null,
                req
            );
        }

        // Fetch employee to check ownership
        const employee = await employeeService.getEmployeeById(id);

        if (!employee) {
            return sendError(
                res,
                404,
                ErrorCode.NOT_FOUND,
                'Employee not found',
                null,
                req
            );
        }

        // Authorization:
        // 1. Admin/HR can update anyone (potentially partial fields)
        // 2. Employee can update themselves (restricted fields usually, like contact info)

        const isSelf = employee.userId === user.userId;
        const isAdminOrHR = user.role === UserRole.ADMIN || user.role === UserRole.HR_OFFICER;

        if (!isSelf && !isAdminOrHR) {
            return sendError(
                res,
                403,
                ErrorCode.FORBIDDEN,
                'Forbidden',
                null,
                req
            );
        }

        // Campus isolation: 
        // 1. Campus users can only update employees in their campus.
        // 2. University Admins are RESTRICTED to read-only oversight for local data.
        assertCanWriteCampusResource(req, employee.campusId);

        const updatedEmployee = await employeeService.updateEmployee(id, data);

        // Audit log (Diff tracking)
        // We log the fields that were requested to be changed
        await auditEmployeeUpdate(
            user.userId,
            id,
            req,
            {
                ...data,
                // Optional: You could compare 'employee' (old) vs 'updatedEmployee' (new) here
                // But logging the requested changes is usually sufficient for "Intent"
            }
        );

        sendSuccess(res, updatedEmployee);

    } catch (error: any) {
        if (
            error?.message === 'Cross-campus access denied' ||
            error?.message === 'Missing campus context for this user' ||
            error?.message === 'University admins have read-only access to local campus resources'
        ) {
            return sendError(res, 403, ErrorCode.FORBIDDEN, error.message, null, req);
        }
        sendError(
            res,
            500,
            ErrorCode.INTERNAL_ERROR,
            error.message,
            null,
            req
        );
    }
};
