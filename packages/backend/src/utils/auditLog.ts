import { AuditAction } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { Request } from 'express';
export { AuditAction };


interface AuditLogParams {
    userId?: number;
    action: AuditAction;
    entityType: string;
    entityId?: number;
    changes?: Record<string, unknown> | null;
    ipAddress?: string;
    userAgent?: string;
}

/**
 * Create an audit log entry
 */
export const createAuditLog = async (params: AuditLogParams) => {
    try {
        await prisma.auditLog.create({
            data: {
                userId: params.userId,
                action: params.action,
                entityType: params.entityType,
                entityId: params.entityId,
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                changes: (params.changes || null) as any,
                ipAddress: params.ipAddress,
                userAgent: params.userAgent,
            },
        });
    } catch (error) {
        // Log error but don't throw - audit logging should not break the main flow
        console.error('Failed to create audit log:', error);
    }
};

/**
 * Helper to extract request metadata
 */
export const getRequestMetadata = (req: Request) => {
    return {
        ipAddress: req.ip || req.socket.remoteAddress,
        userAgent: req.get('user-agent'),
    };
};

/**
 * Audit log wrapper for authentication actions
 */
export const auditAuth = async (
    action: AuditAction,
    userId: number | undefined,
    req: Request,
    changes?: Record<string, unknown>
) => {
    const metadata = getRequestMetadata(req);
    await createAuditLog({
        userId,
        action,
        entityType: 'User',
        entityId: userId,
        changes,
        ...metadata,
    });
};

/**
 * Audit log wrapper for leave request actions
 */
export const auditLeaveRequest = async (
    action: AuditAction,
    userId: number,
    leaveRequestId: number,
    req: Request,
    changes?: Record<string, unknown>
) => {
    const metadata = getRequestMetadata(req);
    await createAuditLog({
        userId,
        action,
        entityType: 'LeaveRequest',
        entityId: leaveRequestId,
        changes,
        ...metadata,
    });
};

/**
 * Audit log wrapper for clearance actions
 */
export const auditClearance = async (
    action: AuditAction,
    userId: number,
    clearanceId: number,
    req: Request,
    changes?: Record<string, unknown>
) => {
    const metadata = getRequestMetadata(req);
    await createAuditLog({
        userId,
        action,
        entityType: 'ClearanceRequest',
        entityId: clearanceId,
        changes,
        ...metadata,
    });
};

/**
 * Audit log wrapper for user management actions
 */
export const auditUserUpdate = async (
    action: AuditAction,
    performerId: number,
    targetUserId: number,
    req: Request,
    changes?: Record<string, unknown>
) => {
    const metadata = getRequestMetadata(req);
    await createAuditLog({
        userId: performerId,
        action,
        entityType: 'User',
        entityId: targetUserId,
        changes,
        ...metadata,
    });
};

/**
 * Get audit logs for a specific entity
 */
export const getAuditLogs = async (
    entityType: string,
    entityId: number,
    limit: number = 50
) => {
    return prisma.auditLog.findMany({
        where: {
            entityType,
            entityId,
        },
        orderBy: {
            timestamp: 'desc',
        },
        take: limit,
    });
};

/**
 * Get audit logs for a specific user
 */
export const getUserAuditLogs = async (userId: number, limit: number = 50) => {
    return prisma.auditLog.findMany({
        where: {
            userId,
        },
        orderBy: {
            timestamp: 'desc',
        },
        take: limit,
    });
};
