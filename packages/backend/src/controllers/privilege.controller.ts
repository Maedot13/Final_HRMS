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
