
import { Prisma, AuditAction } from '@prisma/client';
import { prisma } from '../lib/prisma';

export const logAction = async (data: {
    userId?: number;
    action: AuditAction;
    entityType: string;
    entityId?: number;
    changes?: any;
    ipAddress?: string;
    userAgent?: string;
}) => {
    try {
        await prisma.auditLog.create({
            data: {
                userId: data.userId,
                action: data.action,
                entityType: data.entityType,
                entityId: data.entityId,
                changes: data.changes ? (data.changes as Prisma.InputJsonValue) : undefined,
                ipAddress: data.ipAddress,
                userAgent: data.userAgent
            }
        });
    } catch (error) {
        // Audit logging should not block main application flow, but we should log the error
        console.error('Failed to create audit log:', error);
    }
};
