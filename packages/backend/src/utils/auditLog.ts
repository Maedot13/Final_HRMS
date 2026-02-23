import { AuditAction, AuditStatus } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { Request } from 'express';
export { AuditAction, AuditStatus };


interface AuditLogParams {
    userId?: number;
    action: AuditAction;
    entityType: string;
    entityId?: number;
    changes?: Record<string, unknown> | null;
    status?: AuditStatus;
    metadata?: Record<string, unknown> | null;
    ipAddress?: string;
    userAgent?: string;
}

const SENSITIVE_FIELDS = ['password', 'passwordHash', 'ssn', 'salary', 'accessToken', 'refreshToken', 'token'];

/**
 * Redact sensitive data from a payload recursively
 */
const redactSensitiveData = (data: any): any => {
    if (!data) return data;

    if (Array.isArray(data)) {
        return data.map(item => redactSensitiveData(item));
    }

    if (typeof data === 'object') {
        const redacted: any = {};
        for (const [key, value] of Object.entries(data)) {
            if (SENSITIVE_FIELDS.some(field => key.toLowerCase().includes(field.toLowerCase()))) {
                redacted[key] = '***REDACTED***';
            } else if (typeof value === 'object' && value !== null) {
                redacted[key] = redactSensitiveData(value);
            } else {
                redacted[key] = value;
            }
        }
        return redacted;
    }

    return data;
};

/**
 * Create an audit log entry
 */
export const createAuditLog = async (params: AuditLogParams) => {
    try {
        const redactedChanges = redactSensitiveData(params.changes);

        await prisma.auditLog.create({
            data: {
                userId: params.userId,
                action: params.action,
                entityType: params.entityType,
                entityId: params.entityId,
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                changes: (redactedChanges || null) as any,
                status: params.status || AuditStatus.SUCCESS,
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                metadata: (params.metadata || null) as any,
                ipAddress: params.ipAddress,
                userAgent: params.userAgent,
            },
        });
    } catch (error) {
        // Log error but don't throw - audit logging should not break the main flow
        console.error('Failed to create audit log:', error);

        // If logging fails and the action is critical, optionally we could throw
        // to implement fail-closed. For now, we stick to fail-open with logging.
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

/**
 * Audit log wrapper for employee profile updates
 */
export const auditEmployeeUpdate = async (
    performerId: number,
    targetEmployeeId: number,
    req: Request,
    changes?: Record<string, unknown>
) => {
    const metadata = getRequestMetadata(req);
    await createAuditLog({
        userId: performerId,
        action: AuditAction.EMPLOYEE_UPDATE,
        entityType: 'Employee',
        entityId: targetEmployeeId,
        changes,
        ...metadata,
    });
};
