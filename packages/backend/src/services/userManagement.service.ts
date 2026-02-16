
import { UserRole } from '@prisma/client';
import { prisma } from '../lib/prisma';
import bcrypt from 'bcrypt';

export const getAllUsers = async () => {
    return prisma.user.findMany({
        include: {
            employee: {
                select: {
                    name: true,
                    department: true,
                    position: true
                }
            }
        },
        orderBy: { createdAt: 'desc' }
    });
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

export const resetUserPassword = async (id: number, newPasswordSnippet: string) => {
    const passwordHash = await bcrypt.hash(newPasswordSnippet, 10);
    return prisma.user.update({
        where: { id },
        data: { passwordHash }
    });
};

export const deleteUser = async (id: number) => {
    // This should probably be a soft delete or handled carefully due to FKs
    return prisma.user.update({
        where: { id },
        data: { isActive: false }
    });
};
