
import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { sendError, sendSuccess, ErrorCode } from '../utils/errorHandler';
import { AuditAction } from '@prisma/client';
import { createAuditLog, getRequestMetadata } from '../utils/auditLog';
import { getCampusScope, getCampusIdFilter, assertSameCampus } from '../lib/campusScope';

export const getAuditLogs = async (req: Request, res: Response) => {
    try {
        const {
            userId,
            action,
            entityType,
            startDate,
            endDate,
            page = 1,
            limit = 50
        } = req.query;

        const where: any = {};
        const campusCtx = getCampusScope(req);
        const campusFilter = getCampusIdFilter(campusCtx);
        if (campusFilter != null) where.campusId = campusFilter;

        if (userId) where.userId = parseInt(userId as string);
        if (action) where.action = action as AuditAction;
        if (entityType) where.entityType = entityType as string;

        if (startDate || endDate) {
            where.timestamp = {};
            if (startDate) where.timestamp.gte = new Date(startDate as string);
            if (endDate) where.timestamp.lte = new Date(endDate as string);
        }

        const [logs, total] = await Promise.all([
            prisma.auditLog.findMany({
                where,
                orderBy: { timestamp: 'desc' },
                skip: (parseInt(page as string) - 1) * parseInt(limit as string),
                take: parseInt(limit as string)
            }),
            prisma.auditLog.count({ where })
        ]);

        // Audit the auditors: log who accessed audit logs
        const meta = getRequestMetadata(req);
        await createAuditLog({
            userId: req.user?.userId,
            action: AuditAction.AUDIT_LOG_ACCESSED,
            entityType: 'AuditLog',
            metadata: { filters: { userId, action, entityType, startDate, endDate }, page, limit },
            ...meta,
        });

        sendSuccess(res, {
            data: logs,
            pagination: {
                page: parseInt(page as string),
                limit: parseInt(limit as string),
                total,
                pages: Math.ceil(total / parseInt(limit as string))
            }
        });
    } catch (error: any) {
        if (error?.message === 'Missing campus context for this user') {
            return sendError(res, 403, ErrorCode.FORBIDDEN, 'Forbidden', null, req);
        }
        sendError(res, 500, ErrorCode.INTERNAL_ERROR, error.message, null, req);
    }
};

export const getAuditLogById = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const log = await prisma.auditLog.findUnique({
            where: { id: parseInt(id) }
        });

        if (!log) {
            return sendError(res, 404, ErrorCode.NOT_FOUND, 'Audit log not found', null, req);
        }

        // Campus isolation: campus users can only view audit logs from their campus
        assertSameCampus(req, log.campusId);

        sendSuccess(res, log);
    } catch (error: any) {
        if (error?.message === 'Cross-campus access denied' || error?.message === 'Missing campus context for this user') {
            return sendError(res, 403, ErrorCode.FORBIDDEN, 'Forbidden', null, req);
        }
        sendError(res, 500, ErrorCode.INTERNAL_ERROR, error.message, null, req);
    }
};

export const getMyLogs = async (req: Request, res: Response) => {
    try {
        const userId = req.user?.userId;
        const {
            action,
            entityType,
            startDate,
            endDate,
            page = 1,
            limit = 50
        } = req.query;

        if (!userId) {
            return sendError(res, 401, ErrorCode.UNAUTHORIZED, 'User not authenticated', null, req);
        }

        const where: any = { userId }; // Force filter by current user

        if (action) where.action = action as AuditAction;
        if (entityType) where.entityType = entityType as string;

        if (startDate || endDate) {
            where.timestamp = {};
            if (startDate) where.timestamp.gte = new Date(startDate as string);
            if (endDate) where.timestamp.lte = new Date(endDate as string);
        }

        const [logs, total] = await Promise.all([
            prisma.auditLog.findMany({
                where,
                orderBy: { timestamp: 'desc' },
                skip: (parseInt(page as string) - 1) * parseInt(limit as string),
                take: parseInt(limit as string)
            }),
            prisma.auditLog.count({ where })
        ]);

        sendSuccess(res, {
            data: logs,
            pagination: {
                page: parseInt(page as string),
                limit: parseInt(limit as string),
                total,
                pages: Math.ceil(total / parseInt(limit as string))
            }
        });
    } catch (error: any) {
        sendError(res, 500, ErrorCode.INTERNAL_ERROR, error.message, null, req);
    }
};

export const exportAuditLogs = async (req: Request, res: Response) => {
    try {
        const {
            userId,
            action,
            entityType,
            startDate,
            endDate
        } = req.query;

        const where: any = {};
        const campusCtx = getCampusScope(req);
        const campusFilter = getCampusIdFilter(campusCtx);
        if (campusFilter != null) where.campusId = campusFilter;

        if (userId) where.userId = parseInt(userId as string);
        if (action) where.action = action as AuditAction;
        if (entityType) where.entityType = entityType as string;

        if (startDate || endDate) {
            where.timestamp = {};
            if (startDate) where.timestamp.gte = new Date(startDate as string);
            if (endDate) where.timestamp.lte = new Date(endDate as string);
        }

        const logs = await prisma.auditLog.findMany({
            where,
            orderBy: { timestamp: 'desc' },
            take: 1000 // Limit export to 1000 for safety
        });

        // Audit the export action itself
        const meta = getRequestMetadata(req);
        await createAuditLog({
            userId: req.user?.userId,
            action: AuditAction.AUDIT_LOG_EXPORTED,
            entityType: 'AuditLog',
            metadata: { filters: { userId, action, entityType, startDate, endDate }, count: logs.length },
            ...meta,
        });

        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', 'attachment; filename=audit-logs.json');
        res.send(JSON.stringify(logs, null, 2));

    } catch (error: any) {
        if (error?.message === 'Missing campus context for this user') {
            return sendError(res, 403, ErrorCode.FORBIDDEN, 'Forbidden', null, req);
        }
        sendError(res, 500, ErrorCode.INTERNAL_ERROR, error.message, null, req);
    }
};
