
import { LeaveStatus } from '@prisma/client';
import { differenceInMonths } from 'date-fns';
import { checkOverlappingRequests, checkSabbaticalEligibility } from './timeoff.service';
import { prisma } from '../lib/prisma';
import { createNotification, notifyDepartmentHead } from './notification.service';


export const createSabbaticalRequest = async (
    employeeId: number,
    data: { purpose: string; startDate: string; endDate: string; plan: string; planDocumentUrl?: string }
) => {
    const start = new Date(data.startDate);
    const end = new Date(data.endDate);
    const durationMonths = differenceInMonths(end, start);

    // Rule 1: Sabbatical Duration Limit (<= 12 months)
    if (durationMonths > 12) {
        throw new Error('Sabbatical duration cannot exceed 12 months');
    }
    if (durationMonths <= 0) {
        throw new Error('Invalid dates: End date must be at least 1 month after start date');
    }

    // Rule 2: Eligibility & Cooldown
    await checkSabbaticalEligibility(employeeId);

    // Rule 2.5: Overlap check
    await checkOverlappingRequests(employeeId, start, end);

    // 3. Create Request
    const request = await prisma.sabbaticalRequest.create({
        data: {
            employeeId,
            purpose: data.purpose,
            startDate: start,
            endDate: end,
            durationMonths,
            plan: data.plan,
            planDocumentUrl: data.planDocumentUrl,
            status: LeaveStatus.PENDING
        },
        include: { employee: true }
    });

    // NOTIFICATION: Notify Department Head
    await notifyDepartmentHead(request.employee.department, {
        type: 'SABBATICAL_REQUEST_CREATED',
        title: 'New Sabbatical Request',
        message: `${request.employee.name} has requested a ${request.durationMonths}-month sabbatical.`,
        relatedId: request.id,
        relatedType: 'SABBATICAL_REQUEST'
    });

    return request;
};

export const getSabbaticalRequests = async (employeeId?: number) => {
    if (employeeId) {
        return prisma.sabbaticalRequest.findMany({
            where: { employeeId },
            include: { employee: true },
            orderBy: { createdAt: 'desc' }
        });
    }
    // For HR/Admin, return all
    return prisma.sabbaticalRequest.findMany({
        include: { employee: true },
        orderBy: { createdAt: 'desc' }
    });
};

// For Department Heads - filtered by department
export const getPendingRequests = async (approverDepartment: string) => {
    return prisma.sabbaticalRequest.findMany({
        where: {
            status: LeaveStatus.PENDING,
            employee: {
                department: approverDepartment
            }
        },
        include: { employee: true },
        orderBy: { createdAt: 'asc' }
    });
};

// For HR Officers and Admins - see all requests
export const getAllPendingRequests = async () => {
    return prisma.sabbaticalRequest.findMany({
        where: { status: LeaveStatus.PENDING },
        include: { employee: true },
        orderBy: { createdAt: 'asc' }
    });
};

export const approveSabbatical = async (requestId: number, approverId: number, comment?: string) => {
    const request = await prisma.sabbaticalRequest.findUnique({ where: { id: requestId } });
    if (!request) throw new Error('Sabbatical request not found');
    if (request.status !== LeaveStatus.PENDING) {
        throw new Error(`Cannot approve sabbatical request. Current status: ${request.status}`);
    }

    // Rule 3: Approval
    const updatedRequest = await prisma.sabbaticalRequest.update({
        where: { id: requestId },
        data: {
            status: LeaveStatus.APPROVED,
            approverId,
            approverComment: comment,
            resolvedAt: new Date(),
            lastDecisionAt: new Date(),
            updatedAt: new Date()
        },
        include: { employee: true }
    });

    // Trigger Notification
    await createNotification({
        userId: updatedRequest.employee.userId,
        type: 'SABBATICAL_APPROVED',
        title: 'Sabbatical Request Approved',
        message: `Your sabbatical request for ${updatedRequest.durationMonths} months has been approved.`,
        relatedId: updatedRequest.id,
        relatedType: 'SABBATICAL_REQUEST'
    });

    // Send Email
    const user = await prisma.user.findUnique({ where: { id: updatedRequest.employee.userId } });
    if (user && user.email) {
        const { sendEmail } = await import('./email.service');
        const { templates } = await import('../utils/emailTemplates');
        await sendEmail({
            to: user.email,
            subject: 'Sabbatical Request Approved',
            html: templates.sabbaticalRequestStatusUpdate('Approved', comment)
        });
    }

    return updatedRequest;
};
export const rejectSabbatical = async (requestId: number, approverId: number, comment: string) => {
    const request = await prisma.sabbaticalRequest.findUnique({ where: { id: requestId } });
    if (!request) throw new Error('Sabbatical request not found');
    if (request.status !== LeaveStatus.PENDING) {
        throw new Error(`Cannot reject sabbatical request. Current status: ${request.status}`);
    }

    const updatedRequest = await prisma.sabbaticalRequest.update({
        where: { id: requestId },
        data: {
            status: LeaveStatus.REJECTED,
            approverId,
            approverComment: comment,
            resolvedAt: new Date(),
            lastDecisionAt: new Date(),
            updatedAt: new Date()
        },
        include: { employee: true }
    });

    // Trigger Notification
    await createNotification({
        userId: updatedRequest.employee.userId,
        type: 'SABBATICAL_REJECTED',
        title: 'Sabbatical Request Rejected',
        message: `Your sabbatical request for ${updatedRequest.durationMonths} months has been rejected. Comment: ${comment || 'No comment provided'}`,
        relatedId: updatedRequest.id,
        relatedType: 'SABBATICAL_REQUEST'
    });

    // Send Email
    const user = await prisma.user.findUnique({ where: { id: updatedRequest.employee.userId } });
    if (user && user.email) {
        const { sendEmail } = await import('./email.service');
        const { templates } = await import('../utils/emailTemplates');
        await sendEmail({
            to: user.email,
            subject: 'Sabbatical Request Rejected',
            html: templates.sabbaticalRequestStatusUpdate('Rejected', comment)
        });
    }

    return updatedRequest;
};
