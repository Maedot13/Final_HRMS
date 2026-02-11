import { prisma } from '../lib/prisma';
import { Request } from 'express';

export enum AuditAction {
    USER_LOGIN = 'USER_LOGIN',
    USER_LOGOUT = 'USER_LOGOUT',
    USER_REGISTER = 'USER_REGISTER',
    LEAVE_REQUEST_CREATE = 'LEAVE_REQUEST_CREATE',
    LEAVE_REQUEST_APPROVE = 'LEAVE_REQUEST_APPROVE',
    LEAVE_REQUEST_REJECT = 'LEAVE_REQUEST_REJECT',
    CLEARANCE_INITIATE = 'CLEARANCE_INITIATE',
    CLEARANCE_APPROVE = 'CLEARANCE_APPROVE',
    CLEARANCE_REJECT = 'CLEARANCE_REJECT',
    SABBATICAL_REQUEST_CREATE = 'SABBATICAL_REQUEST_CREATE',
    SABBATICAL_APPROVE = 'SABBATICAL_APPROVE',
    SABBATICAL_REJECT = 'SABBATICAL_REJECT',
    EMPLOYEE_CREATE = 'EMPLOYEE_CREATE',
    EMPLOYEE_UPDATE = 'EMPLOYEE_UPDATE',
    PAYROLL_TRANSFER_CREATE = 'PAYROLL_TRANSFER_CREATE',
}

interface AuditLogParams {
    userId?: number;
    action: AuditAction;
    entityType: string;
    entityId?: number;
    changes?: any;
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
                changes: params.changes || null,
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
    changes?: any
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
    changes?: any
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
    changes?: any
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
