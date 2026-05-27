
import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { appraisalSchema, updateAppraisalSchema, AppraisalInput, UpdateAppraisalInput } from '../schemas/appraisal.schema';
import { sendError, sendSuccess, ErrorCode } from '../utils/errorHandler';
import { AuditAction } from '@prisma/client';
import { createAuditLog, getRequestMetadata } from '../utils/auditLog';
import { createNotification } from '../services/notification.service';
import { getCampusScope, getCampusIdFilter, assertSameCampus } from '../lib/campusScope';

export const createAppraisal = async (req: Request, res: Response) => {
    try {
        const validatedData = appraisalSchema.parse(req.body);
        const evaluatorId = req.user?.userId;

        if (!evaluatorId) {
            return sendError(res, 401, ErrorCode.UNAUTHORIZED, 'User not authenticated');
        }

        // Validate employee exists and is in the same campus (if applicable)
        const employee = await prisma.employee.findUnique({
            where: { id: validatedData.employeeId },
            select: { campusId: true, userId: true, name: true }
        });

        if (!employee) {
            return sendError(res, 404, ErrorCode.NOT_FOUND, 'Employee not found');
        }

        assertSameCampus(req, employee.campusId);

        const deptHeadId = req.user?.userId;
        if (!deptHeadId) return sendError(res, 401, ErrorCode.UNAUTHORIZED, 'Unauthorized');

        const { 
            employeeId, period, efficiencyScore, workOutputScore, comments,
            qualityScore, punctualityScore, knowledgeScore, teamworkScore 
        } = validatedData;

        const appraisal = await prisma.performanceEvaluation.create({
            data: {
                employeeId,
                deptHeadId,
                period,
                efficiencyScore,
                workOutputScore,
                qualityScore,
                punctualityScore,
                knowledgeScore,
                teamworkScore,
                comments,
                status: 'PENDING_HR'
            }
        });

        // Audit Log
        const meta = getRequestMetadata(req);
        await createAuditLog({
            userId: deptHeadId,
            action: AuditAction.PERFORMANCE_EVALUATION_CREATE,
            entityType: 'PerformanceEvaluation',
            entityId: appraisal.id,
            changes: { after: appraisal },
            ...meta
        });

        // Notification to Employee
        await createNotification({
            userId: employee.userId,
            type: 'PERFORMANCE_APPRAISAL',
            title: 'New Performance Evaluation',
            message: `A new performance evaluation for period "${validatedData.period}" has been saved. Your efficiency score: ${validatedData.efficiencyScore}, Work output score: ${validatedData.workOutputScore}.`,
            relatedId: appraisal.id,
            relatedType: 'PerformanceEvaluation',
            campusId: employee.campusId
        });

        sendSuccess(res, appraisal, 201);
    } catch (error: any) {
        if (error.name === 'ZodError') {
            return sendError(res, 400, ErrorCode.VALIDATION_ERROR, 'Validation failed', error.errors);
        }
        if (error.message === 'Cross-campus access denied') {
            return sendError(res, 403, ErrorCode.FORBIDDEN, 'Cross-campus access denied');
        }
        sendError(res, 500, ErrorCode.INTERNAL_ERROR, error.message);
    }
};

export const updateAppraisal = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const data = updateAppraisalSchema.parse(req.body);
        const evaluatorId = req.user?.userId;

        const existing = await prisma.performanceEvaluation.findUnique({
            where: { id: parseInt(id) },
            include: { employee: { select: { campusId: true, userId: true } } }
        });

        if (!existing) {
            return sendError(res, 404, ErrorCode.NOT_FOUND, 'Appraisal not found');
        }

        assertSameCampus(req, existing.employee.campusId);

        const updated = await prisma.performanceEvaluation.update({
            where: { id: parseInt(id) },
            data
        });

        // Audit Log
        const meta = getRequestMetadata(req);
        await createAuditLog({
            userId: evaluatorId,
            action: AuditAction.PERFORMANCE_EVALUATION_UPDATE,
            entityType: 'PerformanceEvaluation',
            entityId: updated.id,
            changes: { before: existing, after: updated },
            ...meta
        });

        // Notification (optional but recommended on update)
        await createNotification({
            userId: existing.employee.userId,
            type: 'PERFORMANCE_APPRAISAL_UPDATE',
            title: 'Performance Evaluation Updated',
            message: `Your performance evaluation for period "${updated.period}" has been updated.`,
            relatedId: updated.id,
            relatedType: 'PerformanceEvaluation',
            campusId: existing.employee.campusId
        });

        sendSuccess(res, updated);
    } catch (error: any) {
        if (error.name === 'ZodError') {
            return sendError(res, 400, ErrorCode.VALIDATION_ERROR, 'Validation failed', error.errors);
        }
        sendError(res, 500, ErrorCode.INTERNAL_ERROR, error.message);
    }
};

export const getMyAppraisals = async (req: Request, res: Response) => {
    try {
        const userId = req.user?.userId;

        if (!userId) {
            return sendError(res, 401, ErrorCode.UNAUTHORIZED, 'User not authenticated');
        }

        const employee = await prisma.employee.findUnique({
            where: { userId }
        });

        if (!employee) {
            return sendError(res, 404, ErrorCode.NOT_FOUND, 'Employee profile not found');
        }

        const appraisals = await prisma.performanceEvaluation.findMany({
            where: {
                employeeId: employee.id,
                status: 'APPROVED'
            },
            orderBy: { createdAt: 'desc' }
        });

        // Get Automated Metrics concurrently
        const automated = await calculateAutomatedMetrics(employee.id, userId);

        sendSuccess(res, {
            formalEvaluations: appraisals,
            automatedMetrics: automated
        });
    } catch (error: any) {
        sendError(res, 500, ErrorCode.INTERNAL_ERROR, error.message);
    }
};

export const getEmployeeAppraisals = async (req: Request, res: Response) => {
    try {
        const { employeeId } = req.params;
        
        const employee = await prisma.employee.findUnique({
            where: { id: parseInt(employeeId) },
            select: { campusId: true }
        });

        if (!employee) {
            return sendError(res, 404, ErrorCode.NOT_FOUND, 'Employee not found');
        }

        assertSameCampus(req, employee.campusId);

        const appraisals = await prisma.performanceEvaluation.findMany({
            where: { employeeId: parseInt(employeeId) },
            orderBy: { createdAt: 'desc' }
        });

        sendSuccess(res, appraisals);
    } catch (error: any) {
        sendError(res, 500, ErrorCode.INTERNAL_ERROR, error.message);
    }
};

// Helper for automated metrics
const calculateAutomatedMetrics = async (employeeId: number, userId: number) => {
    const employee = await prisma.employee.findUnique({
        where: { id: employeeId },
        include: { leaveRequests: { where: { status: 'APPROVED' } } }
    });

    if (!employee) return null;

    let presenceScore = 100;
    const recentLeaves = employee.leaveRequests.filter(l => 
        ['ANNUAL', 'PERSONAL', 'UNPAID'].includes(l.leaveType) && 
        new Date(l.startDate).getFullYear() === new Date().getFullYear()
    );
    
    let totalLeaveDays = 0;
    recentLeaves.forEach(l => {
        const start = new Date(l.startDate);
        const end = new Date(l.endDate);
        const diff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 3600 * 24)) + 1;
        totalLeaveDays += diff;
    });

    presenceScore = Math.max(50, 100 - (totalLeaveDays * 2));

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const activityCount = await prisma.auditLog.count({
        where: {
            userId,
            timestamp: { gte: thirtyDaysAgo }
        }
    });

    const activityScore = Math.min(100, activityCount * 4);

    return {
        presenceScore,
        activityScore,
        automatedSummary: totalLeaveDays > 10 ? "Above average leave usage" : "Excellent attendance",
        activityLevel: activityCount > 20 ? "High" : activityCount > 5 ? "Normal" : "Low"
    };
};

export const approveEvaluation = async (req: Request, res: Response) => {
    try {
        const hrId = req.user?.userId;
        const { id } = req.params;

        const evaluation = await prisma.performanceEvaluation.findUnique({
            where: { id: parseInt(id) },
            include: { employee: { select: { campusId: true, userId: true, name: true } } }
        });

        if (!evaluation) {
            return sendError(res, 404, ErrorCode.NOT_FOUND, 'Evaluation not found');
        }

        // Campus isolation: HR can only approve evaluations for employees in their campus
        assertSameCampus(req, evaluation.employee.campusId);

        const updated = await prisma.performanceEvaluation.update({
            where: { id: parseInt(id) },
            data: {
                status: 'APPROVED',
                hrApprovedById: hrId,
                hrApprovedAt: new Date()
            }
        });

        // Audit Log
        const meta = getRequestMetadata(req);
        await createAuditLog({
            userId: hrId!,
            action: AuditAction.PERFORMANCE_EVALUATION_APPROVE,
            entityType: 'PerformanceEvaluation',
            entityId: updated.id,
            ...meta
        });

        // Notify the evaluated employee so they can see the final result
        await createNotification({
            userId: evaluation.employee.userId,
            type: 'PERFORMANCE_APPRAISAL',
            title: 'Performance Evaluation Approved',
            message: `Your performance evaluation for period "${updated.period}" has been reviewed and approved by Campus HR. Efficiency: ${updated.efficiencyScore}%, Work Output: ${updated.workOutputScore}%.`,
            relatedId: updated.id,
            relatedType: 'PerformanceEvaluation',
            campusId: evaluation.employee.campusId
        });

        sendSuccess(res, updated);
    } catch (error: any) {
        if (error.message === 'Cross-campus access denied' || error.message === 'Missing campus context for this user') {
            return sendError(res, 403, ErrorCode.FORBIDDEN, error.message);
        }
        sendError(res, 500, ErrorCode.INTERNAL_ERROR, error.message);
    }
};

export const rejectEvaluation = async (req: Request, res: Response) => {
    try {
        const hrId = req.user?.userId;
        const { id } = req.params;
        const { reason } = req.body;

        const evaluation = await prisma.performanceEvaluation.findUnique({
            where: { id: parseInt(id) },
            include: { employee: { select: { campusId: true, userId: true, name: true } } }
        });

        if (!evaluation) {
            return sendError(res, 404, ErrorCode.NOT_FOUND, 'Evaluation not found');
        }

        // Campus isolation
        assertSameCampus(req, evaluation.employee.campusId);

        const updated = await prisma.performanceEvaluation.update({
            where: { id: parseInt(id) },
            data: {
                status: 'REJECTED',
                rejectionReason: reason
            }
        });

        // Audit Log
        const meta = getRequestMetadata(req);
        await createAuditLog({
            userId: hrId!,
            action: AuditAction.PERFORMANCE_EVALUATION_REJECT,
            entityType: 'PerformanceEvaluation',
            entityId: updated.id,
            ...meta
        });

        // Notify the Dept Head who submitted the evaluation
        await createNotification({
            userId: evaluation.employee.userId,
            type: 'PERFORMANCE_APPRAISAL',
            title: 'Performance Evaluation Returned',
            message: `Your performance evaluation for period "${updated.period}" was not approved. Reason: ${reason || 'No reason provided.'}`,
            relatedId: updated.id,
            relatedType: 'PerformanceEvaluation',
            campusId: evaluation.employee.campusId
        });

        sendSuccess(res, updated);
    } catch (error: any) {
        if (error.message === 'Cross-campus access denied' || error.message === 'Missing campus context for this user') {
            return sendError(res, 403, ErrorCode.FORBIDDEN, error.message);
        }
        sendError(res, 500, ErrorCode.INTERNAL_ERROR, error.message);
    }
};

export const getPendingEvaluations = async (req: Request, res: Response) => {
    try {
        // Campus scoping: HR Officer should only see evaluations for employees in their campus
        const campusCtx = getCampusScope(req);
        const campusId = getCampusIdFilter(campusCtx);

        const pending = await prisma.performanceEvaluation.findMany({
            where: {
                status: 'PENDING_HR',
                ...(campusId ? { employee: { campusId } } : {}),
            },
            include: { employee: { select: { name: true, employeeId: true, campusId: true } } },
            orderBy: { createdAt: 'desc' }
        });

        sendSuccess(res, pending);
    } catch (error: any) {
        sendError(res, 500, ErrorCode.INTERNAL_ERROR, error.message);
    }
};

export const getAutomatedMetrics = async (req: Request, res: Response) => {
    try {
        const userId = req.user?.userId;
        if (!userId) return sendError(res, 401, ErrorCode.UNAUTHORIZED, 'Unauthorized');

        const employee = await prisma.employee.findUnique({ where: { userId } });
        if (!employee) return sendError(res, 404, ErrorCode.NOT_FOUND, 'Employee profile not found');

        const metrics = await calculateAutomatedMetrics(employee.id, userId);
        sendSuccess(res, metrics);
    } catch (error: any) {
        sendError(res, 500, ErrorCode.INTERNAL_ERROR, error.message);
    }
}
