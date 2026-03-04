import { Request, Response } from 'express';
import * as departmentService from '../services/department.service';
import { sendError, sendSuccess, ErrorCode } from '../utils/errorHandler';
import { createDepartmentSchema, updateDepartmentSchema } from '../schemas/department.schema';

export const getDepartments = async (req: Request, res: Response) => {
    try {
        const campusId = req.user!.campusId;
        if (!campusId) return sendError(res, 400, ErrorCode.VALIDATION_ERROR, 'No campus context', null, req);

        const departments = await departmentService.getDepartments(campusId);
        sendSuccess(res, departments);
    } catch (error: any) {
        sendError(res, 500, ErrorCode.INTERNAL_ERROR, error.message, null, req);
    }
};

export const getDepartmentById = async (req: Request, res: Response) => {
    try {
        const id = parseInt(req.params.id);
        const campusId = req.user!.campusId;
        if (!campusId) return sendError(res, 400, ErrorCode.VALIDATION_ERROR, 'No campus context', null, req);

        const department = await departmentService.getDepartmentById(id, campusId);
        sendSuccess(res, department);
    } catch (error: any) {
        if (error.message === 'Department not found') {
            return sendError(res, 404, ErrorCode.NOT_FOUND, error.message, null, req);
        }
        sendError(res, 500, ErrorCode.INTERNAL_ERROR, error.message, null, req);
    }
};

export const createDepartment = async (req: Request, res: Response) => {
    try {
        const parsed = createDepartmentSchema.safeParse(req.body);
        if (!parsed.success) {
            return sendError(res, 400, ErrorCode.VALIDATION_ERROR, 'Validation failed', parsed.error.flatten(), req);
        }

        const result = await departmentService.createDepartment(parsed.data, req.user!);
        sendSuccess(res, result, 201);
    } catch (error: any) {
        if (error.message.includes('already exists')) {
            return sendError(res, 409, ErrorCode.UNIQUE_CONSTRAINT_VIOLATION, error.message, null, req);
        }
        sendError(res, 400, ErrorCode.INTERNAL_ERROR, error.message, null, req);
    }
};

export const updateDepartment = async (req: Request, res: Response) => {
    try {
        const id = parseInt(req.params.id);
        const campusId = req.user!.campusId;
        if (!campusId) return sendError(res, 400, ErrorCode.VALIDATION_ERROR, 'No campus context', null, req);

        const parsed = updateDepartmentSchema.safeParse(req.body);
        if (!parsed.success) {
            return sendError(res, 400, ErrorCode.VALIDATION_ERROR, 'Validation failed', parsed.error.flatten(), req);
        }

        const result = await departmentService.updateDepartment(id, campusId, parsed.data);
        sendSuccess(res, result);
    } catch (error: any) {
        if (error.message === 'Department not found') {
            return sendError(res, 404, ErrorCode.NOT_FOUND, error.message, null, req);
        }
        if (error.message.includes('already exists')) {
            return sendError(res, 409, ErrorCode.UNIQUE_CONSTRAINT_VIOLATION, error.message, null, req);
        }
        sendError(res, 400, ErrorCode.INTERNAL_ERROR, error.message, null, req);
    }
};

export const deleteDepartment = async (req: Request, res: Response) => {
    try {
        const id = parseInt(req.params.id);
        const campusId = req.user!.campusId;
        if (!campusId) return sendError(res, 400, ErrorCode.VALIDATION_ERROR, 'No campus context', null, req);

        const result = await departmentService.deleteDepartment(id, campusId);
        sendSuccess(res, result);
    } catch (error: any) {
        if (error.message.includes('Cannot delete')) {
            return sendError(res, 400, ErrorCode.VALIDATION_ERROR, error.message, null, req);
        }
        sendError(res, 500, ErrorCode.INTERNAL_ERROR, error.message, null, req);
    }
};

export const assignHead = async (req: Request, res: Response) => {
    try {
        const id = parseInt(req.params.id);
        const { employeeId } = req.body;
        const campusId = req.user!.campusId;
        if (!campusId) return sendError(res, 400, ErrorCode.VALIDATION_ERROR, 'No campus context', null, req);

        if (!employeeId) {
            return sendError(res, 400, ErrorCode.VALIDATION_ERROR, 'employeeId is required', null, req);
        }

        const result = await departmentService.assignDepartmentHead(id, employeeId, campusId);
        sendSuccess(res, result);
    } catch (error: any) {
        if (error.message === 'Department not found') {
            return sendError(res, 404, ErrorCode.NOT_FOUND, error.message, null, req);
        }
        if (error.message === 'Employee not found') {
            return sendError(res, 404, ErrorCode.NOT_FOUND, error.message, null, req);
        }
        sendError(res, 400, ErrorCode.INTERNAL_ERROR, error.message, null, req);
    }
};
