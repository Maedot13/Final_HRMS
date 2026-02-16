
import { Request, Response } from 'express';
import * as reportService from '../services/report.service';
import { sendError, sendSuccess, ErrorCode } from '../utils/errorHandler';

export const getDashboardSummary = async (req: Request, res: Response) => {
    try {
        const summary = await reportService.getDashboardSummary();
        sendSuccess(res, summary);
    } catch (error: any) {
        sendError(res, 500, ErrorCode.INTERNAL_ERROR, error.message, null, req);
    }
};

export const getLeaveStats = async (req: Request, res: Response) => {
    try {
        const stats = await reportService.getLeaveStats();
        sendSuccess(res, stats);
    } catch (error: any) {
        sendError(res, 500, ErrorCode.INTERNAL_ERROR, error.message, null, req);
    }
};

export const getDepartmentStats = async (req: Request, res: Response) => {
    try {
        const stats = await reportService.getDepartmentStats();
        sendSuccess(res, stats);
    } catch (error: any) {
        sendError(res, 500, ErrorCode.INTERNAL_ERROR, error.message, null, req);
    }
};

export const getRecruitmentStats = async (req: Request, res: Response) => {
    try {
        const stats = await reportService.getRecruitmentStats();
        sendSuccess(res, stats);
    } catch (error: any) {
        sendError(res, 500, ErrorCode.INTERNAL_ERROR, error.message, null, req);
    }
};
