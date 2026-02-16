
import { Request, Response } from 'express';
import * as recruitmentService from '../services/recruitment.service';
import {
    createJobPostingSchema,
    updateJobStatusSchema,
    applyForJobSchema,
    updateApplicationStatusSchema
} from '../schemas/recruitment.schema';
import { sendError, sendSuccess, ErrorCode } from '../utils/errorHandler';

export const createJobPosting = async (req: Request, res: Response) => {
    try {
        const validation = createJobPostingSchema.safeParse(req.body);
        if (!validation.success) {
            return sendError(res, 400, ErrorCode.VALIDATION_ERROR, 'Invalid input', validation.error.format(), req);
        }

        const job = await recruitmentService.createJobPosting({
            ...validation.data,
            createdBy: req.user!.userId
        });
        sendSuccess(res, job, 201);
    } catch (error: any) {
        sendError(res, 500, ErrorCode.INTERNAL_ERROR, error.message, null, req);
    }
};

export const getJobPostings = async (req: Request, res: Response) => {
    try {
        const { status, department } = req.query;
        const postings = await recruitmentService.getJobPostings({
            status: status as any,
            department: department as string
        });
        sendSuccess(res, postings);
    } catch (error: any) {
        sendError(res, 500, ErrorCode.INTERNAL_ERROR, error.message, null, req);
    }
};

export const getJobPostingById = async (req: Request, res: Response) => {
    try {
        const id = parseInt(req.params.id);
        const job = await recruitmentService.getJobPostingById(id);
        if (!job) {
            return sendError(res, 404, ErrorCode.NOT_FOUND, 'Job posting not found', null, req);
        }
        sendSuccess(res, job);
    } catch (error: any) {
        sendError(res, 500, ErrorCode.INTERNAL_ERROR, error.message, null, req);
    }
};

export const updateJobStatus = async (req: Request, res: Response) => {
    try {
        const id = parseInt(req.params.id);
        const validation = updateJobStatusSchema.safeParse(req.body);
        if (!validation.success) {
            return sendError(res, 400, ErrorCode.VALIDATION_ERROR, 'Invalid input', validation.error.format(), req);
        }

        const job = await recruitmentService.updateJobStatus(id, validation.data.status);
        sendSuccess(res, job);
    } catch (error: any) {
        sendError(res, 500, ErrorCode.INTERNAL_ERROR, error.message, null, req);
    }
};

export const applyForJob = async (req: Request, res: Response) => {
    try {
        const validation = applyForJobSchema.safeParse(req.body);
        if (!validation.success) {
            return sendError(res, 400, ErrorCode.VALIDATION_ERROR, 'Invalid input', validation.error.format(), req);
        }

        const employee = req.employee!;
        const application = await recruitmentService.applyForJob(
            employee.id,
            req.user!.userId,
            req.user!.role,
            validation.data
        );
        sendSuccess(res, application, 201);
    } catch (error: any) {
        const statusCode = error.message.includes('not found') ? 404 : 400;
        sendError(res, statusCode, ErrorCode.BAD_REQUEST, error.message, null, req);
    }
};

export const getApplicationsForJob = async (req: Request, res: Response) => {
    try {
        const id = parseInt(req.params.id);
        const applications = await recruitmentService.getApplicationsForJob(id);
        sendSuccess(res, applications);
    } catch (error: any) {
        sendError(res, 500, ErrorCode.INTERNAL_ERROR, error.message, null, req);
    }
};

export const updateApplicationStatus = async (req: Request, res: Response) => {
    try {
        const id = parseInt(req.params.id);
        const validation = updateApplicationStatusSchema.safeParse(req.body);
        if (!validation.success) {
            return sendError(res, 400, ErrorCode.VALIDATION_ERROR, 'Invalid input', validation.error.format(), req);
        }

        const application = await recruitmentService.updateApplicationStatus(id, {
            ...validation.data,
            reviewedBy: req.user!.userId
        });
        sendSuccess(res, application);
    } catch (error: any) {
        sendError(res, 500, ErrorCode.INTERNAL_ERROR, error.message, null, req);
    }
};

export const getMyApplications = async (req: Request, res: Response) => {
    try {
        const employee = req.employee!;
        const applications = await recruitmentService.getEmployeeApplications(employee.id);
        sendSuccess(res, applications);
    } catch (error: any) {
        sendError(res, 500, ErrorCode.INTERNAL_ERROR, error.message, null, req);
    }
};
