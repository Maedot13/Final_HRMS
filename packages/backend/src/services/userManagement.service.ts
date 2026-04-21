
import { UserRole } from '@prisma/client';
import { prisma } from '../lib/prisma';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import * as emailService from './email.service';
import { logger } from '../utils/logger';

export const getAllUsers = async (
    campusId?: number, 
    page = 1, 
    limit = 50,
    filters?: { search?: string; role?: string; status?: string; department?: string }
) => {
    const where: any = {};
    if (campusId != null) where.campusId = campusId;

    if (filters) {
        if (filters.search) {
            where.OR = [
                { email: { contains: filters.search, mode: 'insensitive' } },
                { employeeId: { contains: filters.search, mode: 'insensitive' } },
                { employee: { name: { contains: filters.search, mode: 'insensitive' } } }
            ];
        }
        if (filters.role) {
            where.role = filters.role;
        }
        if (filters.status) {
            where.isActive = filters.status === 'active';
        }
        if (filters.department) {
            where.employee = {
                ...where.employee,
                departmentId: parseInt(filters.department)
            };
        }
    }
    const [users, total] = await Promise.all([
        prisma.user.findMany({
            where,
            include: {
                employee: {
                    select: {
                        name: true,
                        department: true,
                        position: true
                    }
                }
            },
            orderBy: { createdAt: 'desc' },
            take: limit,
            skip: (page - 1) * limit
        }),
        prisma.user.count({ where })
    ]);

    return {
        data: users,
        pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
            nextCursor: total > page * limit ? page + 1 : null
        }
    };
};

export const getUserById = async (id: number) => {
    return prisma.user.findUnique({
        where: { id },
        include: { employee: true }
    });
};

export const updateUserRole = async (id: number, role: UserRole) => {
    // If demoting an admin, ensure they aren't the last one
    if (role !== UserRole.ADMIN) {
        const user = await prisma.user.findUnique({ where: { id } });
        if (user?.role === UserRole.ADMIN) {
            const adminCount = await prisma.user.count({
                where: { role: UserRole.ADMIN, isActive: true }
            });
            if (adminCount <= 1) {
                throw new Error('Cannot demote the last active admin');
            }
        }
    }

    return prisma.user.update({
        where: { id },
        data: { role }
    });
};

export const toggleUserStatus = async (id: number, isActive: boolean) => {
    // If deactivating an admin, ensure they aren't the last one
    if (!isActive) {
        const user = await prisma.user.findUnique({ where: { id } });
        if (user?.role === UserRole.ADMIN) {
            const adminCount = await prisma.user.count({
                where: { role: UserRole.ADMIN, isActive: true }
            });
            if (adminCount <= 1) {
                throw new Error('Cannot deactivate the last active admin');
            }
        }
    }

    return prisma.user.update({
        where: { id },
        data: { isActive }
    });
};

export const resetUserPassword = async (id: number) => {
    const user = await prisma.user.findUnique({
        where: { id },
        include: { employee: true }
    });

    if (!user) {
        throw new Error('User not found');
    }

    // Generate a cryptographically secure temporary password
    const tempPassword = crypto.randomBytes(8).toString('base64url');
    const passwordHash = await bcrypt.hash(tempPassword, 10);

    await prisma.user.update({
        where: { id },
        data: {
            passwordHash,
            mustChangePassword: true  // Force the user to change it on next login
        }
    });

    // Send email asynchronously — don't let email failure block the reset response
    const employeeName = user.employee?.name || 'Employee';
    emailService.sendPasswordResetEmail({
        to: user.email,
        name: employeeName,
        employeeId: user.employeeId,
        tempPassword
    }).catch(err => logger.error('Failed to send password reset email', err));

    return { message: 'Password reset successfully. The user will receive an email with their temporary password.' };
};

export const deleteUser = async (id: number) => {
    // This should probably be a soft delete or handled carefully due to FKs
    return prisma.user.update({
        where: { id },
        data: { isActive: false }
    });
};
