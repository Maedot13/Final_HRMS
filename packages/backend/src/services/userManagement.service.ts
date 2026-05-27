
import { UserRole } from '@prisma/client';
import { prisma } from '../lib/prisma';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import * as emailService from './email.service';
import { logger } from '../utils/logger';

/**
 * Finds a faculty by name (case-insensitive) across all colleges in the given campus.
 * If not found, auto-creates it under the first available college (creating a
 * 'General' college first if the campus has no colleges yet).
 */
async function findOrCreateFacultyByName(name: string, campusId: number) {
    // Try to find by name in any college belonging to this campus
    const existing = await prisma.faculty.findFirst({
        where: { name: { equals: name, mode: 'insensitive' }, college: { campusId } },
    });
    if (existing) return existing;

    // Find or create a default college to attach the new faculty to
    let college = await prisma.college.findFirst({ where: { campusId } });
    if (!college) {
        college = await prisma.college.create({
            data: { campusId, name: 'General' },
        });
    }

    // Create the new faculty
    return prisma.faculty.create({
        data: { collegeId: college.id, name },
    });
}

export const getAllUsers = async (
    campusId?: number, 
    page = 1, 
    limit = 50,
    filters?: { search?: string; role?: string; status?: string; department?: string; requesterRole?: string; isHeadHR?: boolean }
) => {
    const where: any = {};
    const andConditions: any[] = [];
    if (campusId != null) where.campusId = campusId;

    if (filters) {
        if (filters.search) {
            andConditions.push({
                OR: [
                    { email: { contains: filters.search, mode: 'insensitive' } },
                    { employeeId: { contains: filters.search, mode: 'insensitive' } },
                    { employee: { name: { contains: filters.search, mode: 'insensitive' } } }
                ]
            });
        }
        if (filters.role) {
            if (filters.role === 'HEAD_HR') {
                where.isHeadHR = true;
            } else {
                where.role = filters.role;
            }
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
        if (filters.requesterRole === 'SUPER_ADMIN') {
            andConditions.push({
                OR: [
                    { role: 'SUPER_ADMIN' },
                    { role: 'ADMIN' },
                    { isHeadHR: true }
                ]
            });
        } else if (filters.requesterRole === 'HR_OFFICER' && !filters.isHeadHR) {
            andConditions.push({
                role: {
                    notIn: ['ADMIN', 'SUPER_ADMIN', 'CLEARANCE_BODY', 'RECRUITMENT_COMMITTEE']
                }
            });
            andConditions.push({
                isHeadHR: false
            });
        }
    }
    if (andConditions.length > 0) {
        where.AND = andConditions;
    }
    const [users, total] = await Promise.all([
        prisma.user.findMany({
            where,
            include: {
                employee: {
                    select: {
                        id: true,
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

export const updateUserRole = async (
    id: number,
    role: UserRole | 'HEAD_HR',
    facultyOpts?: { facultyId?: number; newFacultyName?: string; campusId?: number }
) => {
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

    // Resolve recruitment faculty if promoting to RECRUITMENT_COMMITTEE
    let recruitmentFacultyId: number | null | undefined;
    if (role === UserRole.RECRUITMENT_COMMITTEE && facultyOpts) {
        if (facultyOpts.facultyId) {
            recruitmentFacultyId = facultyOpts.facultyId;
        } else if (facultyOpts.newFacultyName && facultyOpts.campusId) {
            const faculty = await findOrCreateFacultyByName(
                facultyOpts.newFacultyName.trim(),
                facultyOpts.campusId
            );
            recruitmentFacultyId = faculty.id;
        }
    } else if (role !== UserRole.RECRUITMENT_COMMITTEE) {
        // Clear the faculty link if demoting away from committee
        recruitmentFacultyId = null;
    }

    if (role === 'HEAD_HR') {
        return prisma.user.update({
            where: { id },
            data: { role: UserRole.HR_OFFICER, isHeadHR: true, recruitmentFacultyId: null },
        });
    }

    const updateData: Record<string, unknown> = { role: role as UserRole, isHeadHR: false };
    if (recruitmentFacultyId !== undefined) {
        updateData.recruitmentFacultyId = recruitmentFacultyId;
    }

    return prisma.user.update({
        where: { id },
        data: updateData,
        include: { recruitmentFaculty: { select: { id: true, name: true } } },
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
