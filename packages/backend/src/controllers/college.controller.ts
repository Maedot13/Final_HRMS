import { Request, Response } from 'express';
import * as collegeService from '../services/college.service';
import { sendError, sendSuccess, ErrorCode } from '../utils/errorHandler';
import { createCollegeSchema, updateCollegeSchema, assignDeanSchema } from '../schemas/orgHierarchy.schema';

export const getColleges = async (req: Request, res: Response) => {
    try {
        const campusId = req.user!.campusId;
        if (!campusId) return sendError(res, 400, ErrorCode.VALIDATION_ERROR, 'No campus context', null, req);

        const colleges = await collegeService.getColleges(campusId);
        sendSuccess(res, colleges);
    } catch (error: any) {
        sendError(res, 500, ErrorCode.INTERNAL_ERROR, error.message, null, req);
    }
};

export const getCollegeById = async (req: Request, res: Response) => {
    try {
        const id = parseInt(req.params.id);
        const campusId = req.user!.campusId;
        if (!campusId) return sendError(res, 400, ErrorCode.VALIDATION_ERROR, 'No campus context', null, req);

        const college = await collegeService.getCollegeById(id, campusId);
        sendSuccess(res, college);
    } catch (error: any) {
        if (error.message === 'College not found') {
            return sendError(res, 404, ErrorCode.NOT_FOUND, error.message, null, req);
        }
        sendError(res, 500, ErrorCode.INTERNAL_ERROR, error.message, null, req);
    }
};

export const createCollege = async (req: Request, res: Response) => {
    try {
        const parsed = createCollegeSchema.safeParse(req.body);
        if (!parsed.success) {
            return sendError(res, 400, ErrorCode.VALIDATION_ERROR, 'Validation failed', parsed.error.flatten(), req);
        }

        const result = await collegeService.createCollege(parsed.data, req.user!.campusId!);
        sendSuccess(res, result, 201);
    } catch (error: any) {
        if (error.message.includes('already exists')) {
            return sendError(res, 409, ErrorCode.UNIQUE_CONSTRAINT_VIOLATION, error.message, null, req);
        }
        if (error.message.includes('employee')) {
            return sendError(res, 400, ErrorCode.VALIDATION_ERROR, error.message, null, req);
        }
        sendError(res, 400, ErrorCode.INTERNAL_ERROR, error.message, null, req);
    }
};

export const updateCollege = async (req: Request, res: Response) => {
    try {
        const id = parseInt(req.params.id);
        const campusId = req.user!.campusId;
        if (!campusId) return sendError(res, 400, ErrorCode.VALIDATION_ERROR, 'No campus context', null, req);

        const parsed = updateCollegeSchema.safeParse(req.body);
        if (!parsed.success) {
            return sendError(res, 400, ErrorCode.VALIDATION_ERROR, 'Validation failed', parsed.error.flatten(), req);
        }

        const result = await collegeService.updateCollege(id, campusId, parsed.data);
        sendSuccess(res, result);
    } catch (error: any) {
        if (error.message === 'College not found') {
            return sendError(res, 404, ErrorCode.NOT_FOUND, error.message, null, req);
        }
        if (error.message.includes('already exists')) {
            return sendError(res, 409, ErrorCode.UNIQUE_CONSTRAINT_VIOLATION, error.message, null, req);
        }
        sendError(res, 400, ErrorCode.INTERNAL_ERROR, error.message, null, req);
    }
};

export const deleteCollege = async (req: Request, res: Response) => {
    try {
        const id = parseInt(req.params.id);
        const campusId = req.user!.campusId;
        if (!campusId) return sendError(res, 400, ErrorCode.VALIDATION_ERROR, 'No campus context', null, req);

        const result = await collegeService.deleteCollege(id, campusId);
        sendSuccess(res, result);
    } catch (error: any) {
        if (error.message.includes('Cannot delete')) {
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

        const result = await collegeService.assignCollegeDean(id, campusId, parsed.data.employeeId || null);
        sendSuccess(res, result);
    } catch (error: any) {
        if (error.message === 'College not found') {
            return sendError(res, 404, ErrorCode.NOT_FOUND, error.message, null, req);
        }
        if (error.message.includes('employee')) {
            return sendError(res, 404, ErrorCode.NOT_FOUND, error.message, null, req);
        }
        sendError(res, 400, ErrorCode.INTERNAL_ERROR, error.message, null, req);
    }
};
