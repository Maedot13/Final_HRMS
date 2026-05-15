import { Request, Response } from 'express';
import * as employeeService from '../services/employee.service';
import * as authService from '../services/auth.service';
import { UserRole, UserScope } from '@hrms/types';
import { operationalUpdateSchema, updateEmployeeSchema } from '../schemas/employee.schema';
import { sendError, sendSuccess, ErrorCode } from '../utils/errorHandler';
import { auditEmployeeUpdate, AuditAction } from '../utils/auditLog';
import { assertSameCampus, assertCanWriteCampusResource } from '../lib/campusScope';
import { prisma } from '../lib/prisma';

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
        const isPresident = (user.specialPrivileges ?? []).includes('UNIVERSITY_PRESIDENT');
        const isDean = (user.specialPrivileges ?? []).includes('DEAN');

        if (!isSelf && !isAdminOrHR && !isPresident && !isDean) {
            return sendError(
                res,
                403,
                ErrorCode.FORBIDDEN,
                'Forbidden',
                null,
                req
            );
        }

        // Campus isolation: employees can always view their own record;
        // campus admins/HR/Dean can only view employees in their own campus.
        // President can view any campus.
        if (!isSelf && !isPresident) {
            assertSameCampus(req, employee.campusId);
        }

        // EXTRA SECURITY: Strip sensitive data for non-admins
        // Only SUPER_ADMIN, ADMIN, and HR_OFFICER can see salaries
        const canSeeSalary = user.role === UserRole.SUPER_ADMIN || user.role === UserRole.ADMIN || user.role === UserRole.HR_OFFICER;

        const responseData = { ...employee };
        if (!canSeeSalary) {
            delete (responseData as any).grossSalary;
            // Also redact other sensitive fields if they exist
            if ((responseData as any).taxInformation) delete (responseData as any).taxInformation;
        }

        sendSuccess(res, responseData);
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

        // Campus Admin vs Central HR Logic
        let validatedData: any = {};
        try {
            if (user.scope === UserScope.UNIVERSITY) {
                // Central HR can update financial & operational fields
                validatedData = updateEmployeeSchema.parse(req.body);
            } else {
                // Campus Admin or self can ONLY update operational fields
                validatedData = operationalUpdateSchema.parse(req.body);
            }
        } catch (validationError: any) {
            return sendError(res, 400, ErrorCode.VALIDATION_ERROR, 'Invalid request data', validationError.errors, req);
        }

        // Campus isolation: 
        // 1. Campus users can only update employees in their campus.
        // 2. University Admins are ALLOWED to write since they use financialUpdateSchema
        assertCanWriteCampusResource(req, employee.campusId, { allowUniversity: true });

        const updatedEmployee = await employeeService.updateEmployee(id, validatedData);

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

// ─── List Employees ──────────────────────────────────────────────────────────
export const listEmployees = async (req: Request, res: Response) => {
    try {
        const user = req.user!;
        const isPresident = (user.specialPrivileges ?? []).includes('UNIVERSITY_PRESIDENT');
        const campusId = isPresident && req.query.campusId ? parseInt(req.query.campusId as string) : user.campusId;
        const { search, status, cursor, limit } = req.query as Record<string, string>;

        const employees = await prisma.employee.findMany({
            where: {
                ...(campusId ? { campusId } : {}),
                ...(search ? {
                    OR: [
                        { name: { contains: search, mode: 'insensitive' } },
                        { employeeId: { contains: search, mode: 'insensitive' } },
                    ]
                } : {}),
                ...(status === 'INACTIVE' ? { user: { isActive: false } } : status === 'ACTIVE' ? { user: { isActive: true } } : {}),
                ...(cursor ? { id: { gt: parseInt(cursor) } } : {}),
            },
            include: { user: { select: { id: true, email: true, role: true, isActive: true } } },
            take: limit ? parseInt(limit) : 50,
            orderBy: { id: 'asc' },
        });

        sendSuccess(res, employees);
    } catch (error: any) {
        sendError(res, 500, ErrorCode.INTERNAL_ERROR, error.message, null, req);
    }
};

// ─── Create Employee ─────────────────────────────────────────────────────────
export const createEmployee = async (req: Request, res: Response) => {
    try {
        const user = req.user!;
        const creatorContext = {
            userId: user.userId,
            role: user.role,
            scope: user.scope,
            campusId: user.campusId,
            employeeId: user.employeeId,
            employeePkId: user.employeePkId,
        } as any;

        const result = await authService.register(req.body, creatorContext);
        return res.status(201).json({ success: true, data: result.user, rawPassword: result.rawPassword, warning: result.warning });
    } catch (error: any) {
        const status = error.message?.includes('already in use') ? 409 : 400;
        sendError(res, status, ErrorCode.VALIDATION_ERROR, error.message, null, req);
    }
};

// ─── Activate / Deactivate Employee ─────────────────────────────────────────
export const activateEmployee = async (req: Request, res: Response) => {
    try {
        const id = parseInt(req.params.id);
        const { isActive } = req.body;

        if (typeof isActive !== 'boolean') {
            return sendError(res, 400, ErrorCode.VALIDATION_ERROR, '`isActive` boolean is required', null, req);
        }

        const employee = await prisma.employee.findUnique({ where: { id }, select: { userId: true, campusId: true } });
        if (!employee) return sendError(res, 404, ErrorCode.NOT_FOUND, 'Employee not found', null, req);

        assertSameCampus(req, employee.campusId);

        await prisma.user.update({ where: { id: employee.userId }, data: { isActive } });
        sendSuccess(res, { message: `Employee account ${isActive ? 'activated' : 'deactivated'}` });
    } catch (error: any) {
        if (error?.message?.includes('campus')) return sendError(res, 403, ErrorCode.FORBIDDEN, error.message, null, req);
        sendError(res, 500, ErrorCode.INTERNAL_ERROR, error.message, null, req);
    }
};

// ─── Upload Document ─────────────────────────────────────────────────────────
export const uploadDocument = async (req: Request, res: Response) => {
    try {
        const id = parseInt(req.params.id);
        if (!req.file) return sendError(res, 400, ErrorCode.VALIDATION_ERROR, 'No file uploaded', null, req);

        const employee = await prisma.employee.findUnique({ where: { id }, select: { campusId: true } });
        if (!employee) return sendError(res, 404, ErrorCode.NOT_FOUND, 'Employee not found', null, req);

        assertSameCampus(req, employee.campusId);

        const fileUrl = `/uploads/${req.file.filename}`;
        sendSuccess(res, { url: fileUrl, originalName: req.file.originalname });
    } catch (error: any) {
        if (error?.message?.includes('campus')) return sendError(res, 403, ErrorCode.FORBIDDEN, error.message, null, req);
        sendError(res, 500, ErrorCode.INTERNAL_ERROR, error.message, null, req);
    }
};
