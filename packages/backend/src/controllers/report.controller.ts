
import { Request, Response } from 'express';
import * as reportService from '../services/report.service';
import { sendError, sendSuccess, ErrorCode } from '../utils/errorHandler';
import { getCampusScope, getCampusIdFilter } from '../lib/campusScope';

export const getDashboardSummary = async (req: Request, res: Response) => {
    try {
        const campusCtx = getCampusScope(req);
        const campusId = getCampusIdFilter(campusCtx);
        const summary = await reportService.getDashboardSummary(campusId);
        sendSuccess(res, summary);
    } catch (error: any) {
        if (error?.message === 'Missing campus context for this user') {
            return sendError(res, 403, ErrorCode.FORBIDDEN, 'Forbidden', null, req);
        }
        sendError(res, 500, ErrorCode.INTERNAL_ERROR, error.message, null, req);
    }
};

export const getLeaveStats = async (req: Request, res: Response) => {
    try {
        const campusCtx = getCampusScope(req);
        const campusId = getCampusIdFilter(campusCtx);
        const stats = await reportService.getLeaveStats(campusId);
        sendSuccess(res, stats);
    } catch (error: any) {
        if (error?.message === 'Missing campus context for this user') {
            return sendError(res, 403, ErrorCode.FORBIDDEN, 'Forbidden', null, req);
        }
        sendError(res, 500, ErrorCode.INTERNAL_ERROR, error.message, null, req);
    }
};

export const getDepartmentStats = async (req: Request, res: Response) => {
    try {
        const campusCtx = getCampusScope(req);
        const campusId = getCampusIdFilter(campusCtx);
        const stats = await reportService.getDepartmentStats(campusId);
        sendSuccess(res, stats);
    } catch (error: any) {
        if (error?.message === 'Missing campus context for this user') {
            return sendError(res, 403, ErrorCode.FORBIDDEN, 'Forbidden', null, req);
        }
        sendError(res, 500, ErrorCode.INTERNAL_ERROR, error.message, null, req);
    }
};

export const getRecruitmentStats = async (req: Request, res: Response) => {
    try {
        const campusCtx = getCampusScope(req);
        const campusId = getCampusIdFilter(campusCtx);
        const stats = await reportService.getRecruitmentStats(campusId);
        sendSuccess(res, stats);
    } catch (error: any) {
        if (error?.message === 'Missing campus context for this user') {
            return sendError(res, 403, ErrorCode.FORBIDDEN, 'Forbidden', null, req);
        }
        sendError(res, 500, ErrorCode.INTERNAL_ERROR, error.message, null, req);
    }
};
