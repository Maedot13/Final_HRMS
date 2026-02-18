
import { prisma } from '../lib/prisma';

export const createNotification = async (data: {
    userId: number;
    type: string;
    title: string;
    message: string;
    relatedId?: number;
    relatedType?: string;
}) => {
    return prisma.notification.create({
        data: {
            ...data,
            isRead: false
        }
    });
};

export const getUserNotifications = async (userId: number) => {
    return prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 50
    });
};

export const markAsRead = async (id: number, userId: number) => {
    return prisma.notification.updateMany({
        where: { id, userId },
        data: { isRead: true }
    });
};

export const markAllAsRead = async (userId: number) => {
    return prisma.notification.updateMany({
        where: { userId, isRead: false },
        data: { isRead: true }
    });
};

export const getUnreadCount = async (userId: number) => {
    return prisma.notification.count({
        where: { userId, isRead: false }
    });
};

// Utility to notify multiple users (e.g., all admins or a whole department)
export const notifyUsers = async (userIds: number[], notification: {
    type: string;
    title: string;
    message: string;
    relatedId?: number;
    relatedType?: string;
}) => {
    // Basic deduplication if needed, but not critical for now
    const uniqueUserIds = [...new Set(userIds)];
    const data = uniqueUserIds.map(userId => ({
        ...notification,
        userId,
        isRead: false
    }));

    return prisma.notification.createMany({
        data
    });
};

export const notifyRole = async (role: string, notification: {
    type: string;
    title: string;
    message: string;
    relatedId?: number;
    relatedType?: string;
}) => {
    const users = await prisma.user.findMany({
        where: { role: role as import('@prisma/client').UserRole, isActive: true },
        select: { id: true }
    });
    const userIds = users.map(u => u.id);
    if (userIds.length > 0) {
        return notifyUsers(userIds, notification);
    }
};

export const notifyDepartmentHead = async (department: string, notification: {
    type: string;
    title: string;
    message: string;
    relatedId?: number;
    relatedType?: string;
}) => {
    // Find the DEPARTMENT_HEAD for this specific department
    const heads = await prisma.employee.findMany({
        where: {
            department: {
                equals: department,
                mode: 'insensitive' // Makes it case-insensitive
            },
            user: {
                role: 'DEPARTMENT_HEAD',
                isActive: true
            }
        },
        select: { userId: true }
    });

    const userIds = heads.map(h => h.userId);
    if (userIds.length > 0) {
        return notifyUsers(userIds, notification);
    }
};
