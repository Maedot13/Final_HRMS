import { LeaveType, LeaveStatus } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { logger } from '../utils/logger';

export const getFinanceLeaveData = async (campusId?: number) => {
    const leaves = await prisma.leaveRequest.findMany({
        where: {
            status: LeaveStatus.APPROVED,
            leaveType: {
                in: [LeaveType.SABBATICAL, LeaveType.RESEARCH, LeaveType.UNPAID]
            },
            ...(campusId ? { employee: { campusId } } : {})
        },
        include: {
            employee: true
        },
        orderBy: {
            resolvedAt: 'desc'
        },
        distinct: ['employeeId', 'leaveType']
    });

    return leaves.map(request => {
        let paymentInstruction: 'Full Pay' | 'Partial Pay' | 'No Pay' = 'No Pay';
        if (request.leaveType === LeaveType.SABBATICAL) paymentInstruction = 'Full Pay';
        if (request.leaveType === LeaveType.RESEARCH) paymentInstruction = 'Full Pay'; // Default to full pay for Research as per spec
        
        return {
            id: request.id,
            employeeDetails: request.employee,
            leaveType: request.leaveType,
            durationDays: request.days,
            paymentInstruction,
            receivedAt: request.resolvedAt || request.lastDecisionAt || request.updatedAt
        };
    });
};

export const financeLeaveDataStore: any[] = [];

export const sendLeaveToFinance = async (data: {
    employeeDetails: any;
    leaveType: LeaveType;
    durationDays: number;
    paymentInstruction: 'Full Pay' | 'Partial Pay' | 'No Pay';
}) => {
    // This is a no-op now, as we're fetching dynamically from DB. 
    // Kept here so we don't break the existing call in leave.service.ts.
    logger.info(`Notified finance of leave approval: ${data.leaveType} for employee ${data.employeeDetails?.employeeId}`);
};
