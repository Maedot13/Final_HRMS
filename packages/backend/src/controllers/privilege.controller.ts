import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { UserRole } from '@hrms/types';
import { sendError, sendSuccess, ErrorCode } from '../utils/errorHandler';
import { getCampusScope } from '../lib/campusScope';

export const listPrivilegedUsers = async (req: Request, res: Response) => {
    try {
        const campusCtx = getCampusScope(req);
        
        // Find users with elevated roles
        const users = await prisma.user.findMany({
            where: {
                role: { in: ['SUPER_ADMIN', 'HEAD_HR'] },
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
        const { userId, role } = req.body;
        
        if (!userId || !role) {
            return sendError(res, 400, ErrorCode.VALIDATION_ERROR, 'userId and role are required', null, req);
        }
        
        if (role !== 'SUPER_ADMIN' && role !== 'HEAD_HR') {
            return sendError(res, 400, ErrorCode.VALIDATION_ERROR, 'Invalid privilege role. Must be SUPER_ADMIN or HEAD_HR', null, req);
        }
        
        const operator = req.user!;
        
        // Only SUPER_ADMIN can assign another SUPER_ADMIN
        if (role === 'SUPER_ADMIN' && operator.role !== UserRole.SUPER_ADMIN) {
             return sendError(res, 403, ErrorCode.FORBIDDEN, 'Only SUPER_ADMIN can assign SUPER_ADMIN privilege', null, req);
        }

        const targetUser = await prisma.user.findUnique({ where: { id: userId } });
        if (!targetUser) {
             return sendError(res, 404, ErrorCode.NOT_FOUND, 'Target user not found', null, req);
        }
        
        // Scope boundary check
        if (operator.scope === 'CAMPUS' && targetUser.campusId !== operator.campusId) {
             return sendError(res, 403, ErrorCode.FORBIDDEN, 'Cannot assign privileges outside your campus', null, req);
        }
        
        // For resetting privilege we use the previous base role if we implemented it, or otherwise they revert to HR_OFFICER / ADMIN later.
        // Actually, if they are given HEAD_HR, their role becomes HEAD_HR.
        const updated = await prisma.user.update({
            where: { id: userId },
            data: { role: role }
        });
        
        sendSuccess(res, { message: `Privilege ${role} assigned successfully`, user: { id: updated.id, role: updated.role } });
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
        
        // By default when revoked, we fallback their role to their original. 
        // If unknown, fallback to HR_OFFICER for HEAD_HR, ADMIN for SUPER_ADMIN.
        let fallbackRole: 'HR_OFFICER' | 'ADMIN' | 'EMPLOYEE' = 'HR_OFFICER';
        if (targetUser.role === 'SUPER_ADMIN') fallbackRole = 'ADMIN';

        const updated = await prisma.user.update({
            where: { id: userId },
            data: { role: fallbackRole }
        });
        
        sendSuccess(res, { message: 'Privilege revoked', user: { id: updated.id, role: updated.role } });
    } catch (error: any) {
         sendError(res, 500, ErrorCode.INTERNAL_ERROR, error.message, null, req);
    }
};
