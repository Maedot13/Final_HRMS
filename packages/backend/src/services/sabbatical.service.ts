
import { LeaveStatus } from '@prisma/client';
import { differenceInMonths } from 'date-fns';
import { checkOverlappingRequests, checkSabbaticalEligibility } from './timeoff.service';
import { prisma } from '../lib/prisma';


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

    return prisma.sabbaticalRequest.create({
        data: {
            employeeId,
            purpose: data.purpose,
            startDate: start,
            endDate: end,
            durationMonths,
            plan: data.plan,
            planDocumentUrl: data.planDocumentUrl,
            status: LeaveStatus.PENDING
        }
    });
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

export const approveSabbatical = async (requestId: number, approverId: number, comment?: string) => {
    const request = await prisma.sabbaticalRequest.findUnique({ where: { id: requestId } });
    if (!request) throw new Error('Sabbatical request not found');
    if (request.status !== LeaveStatus.PENDING) {
        throw new Error(`Cannot approve sabbatical request. Current status: ${request.status}`);
    }

    // Rule 3: Approval (Usually HR verifies then Dept Head, simplified here to one step or check role in controller)
    return prisma.sabbaticalRequest.update({
        where: { id: requestId },
        data: {
            status: LeaveStatus.APPROVED,
            approverId,
            approverComment: comment,
            resolvedAt: new Date(),
            lastDecisionAt: new Date(),
            updatedAt: new Date()
        }
    });
};
export const rejectSabbatical = async (requestId: number, approverId: number, comment: string) => {
    const request = await prisma.sabbaticalRequest.findUnique({ where: { id: requestId } });
    if (!request) throw new Error('Sabbatical request not found');
    if (request.status !== LeaveStatus.PENDING) {
        throw new Error(`Cannot reject sabbatical request. Current status: ${request.status}`);
    }

    return prisma.sabbaticalRequest.update({
        where: { id: requestId },
        data: {
            status: LeaveStatus.REJECTED,
            approverId,
            approverComment: comment,
            resolvedAt: new Date(),
            lastDecisionAt: new Date(),
            updatedAt: new Date()
        }
    });
};
