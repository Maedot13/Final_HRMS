
import { PrismaClient, LeaveRequest, LeaveStatus, LeaveType } from '@prisma/client';
import { checkOverlappingRequests } from './timeoff.service';

const prisma = new PrismaClient();

// Helper to get duration in days (excluding weekends/holidays - simplified for now to just diff)
const calculateDays = (start: Date, end: Date): number => {
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // Inclusive
    return diffDays;
};

export const createLeaveRequest = async (
    employeeId: number,
    data: { leaveType: LeaveType; startDate: string; endDate: string; reason: string; attachmentUrl?: string }
) => {
    const start = new Date(data.startDate);
    const end = new Date(data.endDate);
    const days = calculateDays(start, end);
    const year = start.getFullYear();

    // 1. Get or Create Balance for this year (Atomic Upsert)
    // We use upsert to handle potential race conditions where two requests might try to initialize balance
    const balance = await prisma.leaveBalance.upsert({
        where: {
            employeeId_year: {
                employeeId,
                year
            }
        },
        update: {}, // No changes if exists
        create: {
            employeeId,
            year,
            annualBalance: 20, // Default annual leave
            sickBalance: 15,
            maternityBalance: 90,
            paternityBalance: 5
        }
    });

    // 2. Check Balance
    let hasBalance = true;
    switch (data.leaveType) {
        case LeaveType.ANNUAL:
            if (balance.annualBalance < days) hasBalance = false;
            break;
        case LeaveType.SICK:
            if (balance.sickBalance < days) hasBalance = false;
            break;
        case LeaveType.MATERNITY:
            if (balance.maternityBalance < days) hasBalance = false;
            break;
        case LeaveType.PATERNITY:
            if (balance.paternityBalance < days) hasBalance = false;
            break;
        case LeaveType.UNPAID:
            hasBalance = true; // Always allow unpaid?
            break;
    }

    if (!hasBalance) {
        throw new Error(`Insufficient leave balance for ${data.leaveType}`);
    }

    // 2.5 Check for overlapping requests
    await checkOverlappingRequests(employeeId, start, end);

    // 3. Create Request
    return prisma.leaveRequest.create({
        data: {
            employeeId,
            leaveType: data.leaveType,
            startDate: start,
            endDate: end,
            days,
            reason: data.reason,
            attachmentUrl: data.attachmentUrl,
            status: LeaveStatus.PENDING
        }
    });
};

export const getEmployeeRequests = async (employeeId: number) => {
    return prisma.leaveRequest.findMany({
        where: { employeeId },
        orderBy: { createdAt: 'desc' }
    });
};

export const getPendingRequests = async () => {
    // In a real app, filtering by department would happen here based on the Approver's department
    return prisma.leaveRequest.findMany({
        where: { status: LeaveStatus.PENDING },
        include: { employee: true },
        orderBy: { createdAt: 'asc' }
    });
};

export const approveRequest = async (requestId: number, approverId: number, comment?: string) => {
    return prisma.$transaction(async (tx) => {
        const request = await tx.leaveRequest.findUnique({ where: { id: requestId } });
        if (!request) throw new Error('Request not found');
        if (request.status !== LeaveStatus.PENDING) throw new Error('Request is not pending');

        // Deduct Balance
        const year = request.startDate.getFullYear();
        const balance = await tx.leaveBalance.findUnique({
            where: { employeeId_year: { employeeId: request.employeeId, year } }
        });

        if (!balance) throw new Error('Leave balance record missing');

        // Re-check balance atomic
        let updateData = {};
        switch (request.leaveType) {
            case LeaveType.ANNUAL:
                if (balance.annualBalance < request.days) throw new Error('Insufficient balance');
                updateData = { annualBalance: { decrement: request.days } };
                break;
            case LeaveType.SICK:
                if (balance.sickBalance < request.days) throw new Error('Insufficient balance');
                updateData = { sickBalance: { decrement: request.days } };
                break;
            case LeaveType.MATERNITY:
                if (balance.maternityBalance < request.days) throw new Error('Insufficient balance');
                updateData = { maternityBalance: { decrement: request.days } };
                break;
            case LeaveType.PATERNITY:
                if (balance.paternityBalance < request.days) throw new Error('Insufficient balance');
                updateData = { paternityBalance: { decrement: request.days } };
                break;
        }

        if (Object.keys(updateData).length > 0) {
            await tx.leaveBalance.update({
                where: { id: balance.id },
                data: updateData
            });
        }

        // Update Request Status
        return tx.leaveRequest.update({
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
    });
};

export const rejectRequest = async (requestId: number, approverId: number, comment?: string) => {
    const request = await prisma.leaveRequest.findUnique({ where: { id: requestId } });
    if (!request) throw new Error('Request not found');
    if (request.status !== LeaveStatus.PENDING) {
        throw new Error(`Cannot reject leave request. Current status: ${request.status}`);
    }

    return prisma.leaveRequest.update({
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
