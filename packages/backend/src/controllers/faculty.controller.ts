import { Request, Response } from 'express';
import * as facultyService from '../services/faculty.service';
import { sendError, sendSuccess, ErrorCode } from '../utils/errorHandler';
import { createFacultySchema, updateFacultySchema, assignDeanSchema } from '../schemas/orgHierarchy.schema';

export const getFaculties = async (req: Request, res: Response) => {
    try {
        const collegeId = parseInt(req.query.collegeId as string);
        if (!collegeId) return sendError(res, 400, ErrorCode.VALIDATION_ERROR, 'collegeId query param required', null, req);

        const faculties = await facultyService.getFaculties(collegeId);
        sendSuccess(res, faculties);
    } catch (error: any) {
        sendError(res, 500, ErrorCode.INTERNAL_ERROR, error.message, null, req);
    }
};

/** Returns all faculties in the requester's campus (no collegeId required). */
export const getCampusFaculties = async (req: Request, res: Response) => {
    try {
        const campusId = req.user?.campusId;
        if (!campusId) return sendError(res, 400, ErrorCode.VALIDATION_ERROR, 'No campus context', null, req);

        const faculties = await facultyService.getFacultiesByCampus(campusId);
        sendSuccess(res, faculties);
    } catch (error: any) {
        sendError(res, 500, ErrorCode.INTERNAL_ERROR, error.message, null, req);
    }
};

export const getFacultyById = async (req: Request, res: Response) => {
    try {
        const id = parseInt(req.params.id);
        const faculty = await facultyService.getFacultyById(id);
        
        // Ensure campus check
        if (faculty.college.campusId !== req.user!.campusId) {
             return sendError(res, 404, ErrorCode.NOT_FOUND, 'Faculty not found', null, req);
        }
        
        sendSuccess(res, faculty);
    } catch (error: any) {
        if (error.message === 'Faculty not found') {
            return sendError(res, 404, ErrorCode.NOT_FOUND, error.message, null, req);
        }
        sendError(res, 500, ErrorCode.INTERNAL_ERROR, error.message, null, req);
    }
};

export const createFaculty = async (req: Request, res: Response) => {
    try {
        const parsed = createFacultySchema.safeParse(req.body);
        if (!parsed.success) {
            return sendError(res, 400, ErrorCode.VALIDATION_ERROR, 'Validation failed', parsed.error.flatten(), req);
        }

        const result = await facultyService.createFaculty(parsed.data, req.user!.campusId!);
        sendSuccess(res, result, 201);
    } catch (error: any) {
        if (error.message.includes('already exists')) {
            return sendError(res, 409, ErrorCode.UNIQUE_CONSTRAINT_VIOLATION, error.message, null, req);
        }
        if (error.message.includes('employee') || error.message.includes('College')) {
            return sendError(res, 400, ErrorCode.VALIDATION_ERROR, error.message, null, req);
        }
        sendError(res, 400, ErrorCode.INTERNAL_ERROR, error.message, null, req);
    }
};

export const updateFaculty = async (req: Request, res: Response) => {
    try {
        const id = parseInt(req.params.id);
        const campusId = req.user!.campusId;
        if (!campusId) return sendError(res, 400, ErrorCode.VALIDATION_ERROR, 'No campus context', null, req);

        const parsed = updateFacultySchema.safeParse(req.body);
        if (!parsed.success) {
            return sendError(res, 400, ErrorCode.VALIDATION_ERROR, 'Validation failed', parsed.error.flatten(), req);
        }

        const result = await facultyService.updateFaculty(id, campusId, parsed.data);
        sendSuccess(res, result);
    } catch (error: any) {
        if (error.message.includes('not found')) {
            return sendError(res, 404, ErrorCode.NOT_FOUND, error.message, null, req);
        }
        if (error.message.includes('already exists')) {
            return sendError(res, 409, ErrorCode.UNIQUE_CONSTRAINT_VIOLATION, error.message, null, req);
        }
        sendError(res, 400, ErrorCode.INTERNAL_ERROR, error.message, null, req);
    }
};

export const deleteFaculty = async (req: Request, res: Response) => {
    try {
        const id = parseInt(req.params.id);
        const campusId = req.user!.campusId;
        if (!campusId) return sendError(res, 400, ErrorCode.VALIDATION_ERROR, 'No campus context', null, req);

        const result = await facultyService.deleteFaculty(id, campusId);
        sendSuccess(res, result);
    } catch (error: any) {
        if (error.message.includes('Cannot delete') || error.message.includes('not found')) {
            return sendError(res, 400, ErrorCode.VALIDATION_ERROR, error.message, null, req);
        }
        sendError(res, 500, ErrorCode.INTERNAL_ERROR, error.message, null, req);
    }
};

export const assignDean = async (req: Request, res: Response) => {
    try {
        const id = parseInt(req.params.id);
        const parsed = assignDeanSchema.safeParse(req.body);
        if (!parsed.success) {
            return sendError(res, 400, ErrorCode.VALIDATION_ERROR, 'Validation failed', parsed.error.flatten(), req);
        }
        
        const campusId = req.user!.campusId;
        if (!campusId) return sendError(res, 400, ErrorCode.VALIDATION_ERROR, 'No campus context', null, req);

        const result = await facultyService.assignFacultyDean(id, campusId, parsed.data.employeeId || null);
        sendSuccess(res, result);
    } catch (error: any) {
        if (error.message.includes('not found')) {
            return sendError(res, 404, ErrorCode.NOT_FOUND, error.message, null, req);
        }
        sendError(res, 400, ErrorCode.INTERNAL_ERROR, error.message, null, req);
    }
};
