import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { UserRole } from '@hrms/types';
import { sendError, sendSuccess, ErrorCode } from '../utils/errorHandler';
import { getCampusScope } from '../lib/campusScope';

export const listPrivilegedUsers = async (req: Request, res: Response) => {
    try {
        const campusCtx = getCampusScope(req);
        
        // Find users with elevated roles (SUPER_ADMIN) or any special privileges or isHeadHR
        const users = await prisma.user.findMany({
            where: {
                OR: [
                    { role: 'SUPER_ADMIN' },
                    { isHeadHR: true },
                    { specialPrivileges: { hasSome: ['DEAN', 'DIRECTOR', 'UNIVERSITY_PRESIDENT', 'VICE_PRESIDENT'] } }
                ],
                ...(campusCtx.scope === 'CAMPUS' ? { campusId: campusCtx.campusId } : {})
            },
            include: {
                employee: { select: { name: true, employeeId: true } },
                campus: { select: { name: true } }
            }
        });
        
        sendSuccess(res, users);
    } catch (error: any) {
        sendError(res, 500, ErrorCode.INTERNAL_ERROR, error.message, null, req);
    }
};

export const assignPrivilege = async (req: Request, res: Response) => {
    try {
        const { userId, role, isHeadHR, specialPrivileges } = req.body;
        
        if (!userId) {
            return sendError(res, 400, ErrorCode.VALIDATION_ERROR, 'userId is required', null, req);
        }
        
        const operator = req.user!;
        
        // Only SUPER_ADMIN can assign another SUPER_ADMIN
        if (role === 'SUPER_ADMIN' && operator.role !== UserRole.SUPER_ADMIN) {
             return sendError(res, 403, ErrorCode.FORBIDDEN, 'Only SUPER_ADMIN can assign SUPER_ADMIN role', null, req);
        }

        const targetUser = await prisma.user.findUnique({ where: { id: userId } });
        if (!targetUser) {
             return sendError(res, 404, ErrorCode.NOT_FOUND, 'Target user not found', null, req);
        }
        
        // Scope boundary check
        if (operator.scope === 'CAMPUS' && targetUser.campusId !== operator.campusId) {
             return sendError(res, 403, ErrorCode.FORBIDDEN, 'Cannot assign privileges outside your campus', null, req);
        }
        
        const updateData: any = {};
        if (role === 'SUPER_ADMIN') updateData.role = 'SUPER_ADMIN';
        if (isHeadHR !== undefined) updateData.isHeadHR = isHeadHR;
        if (specialPrivileges !== undefined && Array.isArray(specialPrivileges)) updateData.specialPrivileges = specialPrivileges;

        const updated = await prisma.user.update({
            where: { id: userId },
            data: updateData
        });
        
        sendSuccess(res, { message: `Privileges updated successfully`, user: { id: updated.id, role: updated.role, isHeadHR: updated.isHeadHR, specialPrivileges: updated.specialPrivileges } });
    } catch (error: any) {
        sendError(res, 500, ErrorCode.INTERNAL_ERROR, error.message, null, req);
    }
};

export const revokePrivilege = async (req: Request, res: Response) => {
    try {
        const userId = parseInt(req.params.userId);
        const operator = req.user!;
        
        const targetUser = await prisma.user.findUnique({ where: { id: userId } });
        if (!targetUser) {
             return sendError(res, 404, ErrorCode.NOT_FOUND, 'Target user not found', null, req);
        }

        if (operator.scope === 'CAMPUS' && targetUser.campusId !== operator.campusId) {
             return sendError(res, 403, ErrorCode.FORBIDDEN, 'Cannot revoke privileges outside your campus', null, req);
        }
        
        // Define fallback for SUPER_ADMIN
        const fallbackRole = targetUser.role === 'SUPER_ADMIN' ? 'ADMIN' : targetUser.role;

        const updated = await prisma.user.update({
            where: { id: userId },
            data: { 
                role: fallbackRole,
                isHeadHR: false,
                specialPrivileges: []
            }
        });
        
        sendSuccess(res, { message: 'Privileges revoked', user: { id: updated.id, role: updated.role, isHeadHR: updated.isHeadHR, specialPrivileges: updated.specialPrivileges } });
    } catch (error: any) {
         sendError(res, 500, ErrorCode.INTERNAL_ERROR, error.message, null, req);
    }
};

import { AuditAction } from '@prisma/client';
import { logAction } from '../services/auditLog.service';

export const assignAVP = async (req: Request, res: Response) => {
    try {
        const { employeeId } = req.body;
        if (!employeeId) {
            return sendError(res, 400, ErrorCode.VALIDATION_ERROR, 'employeeId is required', null, req);
        }

        const employee = await prisma.employee.findUnique({
            where: { employeeId },
            include: { user: true }
        });

        if (!employee || !employee.user) {
            return sendError(res, 404, ErrorCode.NOT_FOUND, 'Active employee with a user account not found', null, req);
        }

        if (employee.employmentStatus !== 'ACTIVE' || !employee.user.isActive) {
            return sendError(res, 400, ErrorCode.VALIDATION_ERROR, 'Employee or user account is not active', null, req);
        }

        const currentPrivileges = employee.user.specialPrivileges || [];
        if (currentPrivileges.includes('VICE_PRESIDENT')) {
            return sendSuccess(res, { message: 'Employee is already assigned as AVP' });
        }

        const updatedUser = await prisma.$transaction(async (tx) => {
            return await tx.user.update({
                where: { id: employee.user!.id },
                data: {
                    specialPrivileges: {
                        push: 'VICE_PRESIDENT'
                    }
                }
            });
        });

        await logAction({
            userId: req.user!.userId,
            action: AuditAction.USER_ROLE_UPDATE,
            entityType: 'User',
            entityId: updatedUser.id,
            changes: { assignedPrivilege: 'VICE_PRESIDENT', targetEmployeeId: employeeId },
            ipAddress: req.ip,
            userAgent: req.headers['user-agent']
        });

        sendSuccess(res, { message: 'AVP position assigned successfully', user: updatedUser });
    } catch (error: any) {
        sendError(res, 500, ErrorCode.INTERNAL_ERROR, error.message, null, req);
    }
};

export const revokeAVP = async (req: Request, res: Response) => {
    try {
        const { employeeId } = req.params;

        const employee = await prisma.employee.findUnique({
            where: { employeeId },
            include: { user: true }
        });

        if (!employee || !employee.user) {
            return sendError(res, 404, ErrorCode.NOT_FOUND, 'Active employee with a user account not found', null, req);
        }

        const currentPrivileges = employee.user.specialPrivileges || [];
        if (!currentPrivileges.includes('VICE_PRESIDENT')) {
            return sendSuccess(res, { message: 'Employee is not assigned as AVP' });
        }

        const updatedPrivileges = currentPrivileges.filter(p => p !== 'VICE_PRESIDENT');

        const updatedUser = await prisma.$transaction(async (tx) => {
            return await tx.user.update({
                where: { id: employee.user!.id },
                data: {
                    specialPrivileges: updatedPrivileges
                }
            });
        });

        await logAction({
            userId: req.user!.userId,
            action: AuditAction.USER_ROLE_UPDATE,
            entityType: 'User',
            entityId: updatedUser.id,
            changes: { revokedPrivilege: 'VICE_PRESIDENT', targetEmployeeId: employeeId },
            ipAddress: req.ip,
            userAgent: req.headers['user-agent']
        });

        sendSuccess(res, { message: 'AVP position revoked successfully', user: updatedUser });
    } catch (error: any) {
        sendError(res, 500, ErrorCode.INTERNAL_ERROR, error.message, null, req);
    }
};
