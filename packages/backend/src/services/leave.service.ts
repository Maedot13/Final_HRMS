
import { LeaveStatus, LeaveType } from '@prisma/client';
import { checkOverlappingRequests } from './timeoff.service';
import { prisma } from '../lib/prisma';
import { LEAVE_BALANCES } from '../config/constants';
import { eventBus, AppEvents } from '../utils/eventBus';

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
            annualBalance: LEAVE_BALANCES.ANNUAL,
            sickBalance: LEAVE_BALANCES.SICK,
            maternityBalance: LEAVE_BALANCES.MATERNITY,
            paternityBalance: LEAVE_BALANCES.PATERNITY
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
    const request = await prisma.leaveRequest.create({
        data: {
            employeeId,
            leaveType: data.leaveType,
            startDate: start,
            endDate: end,
            days,
            reason: data.reason,
            attachmentUrl: data.attachmentUrl,
            status: LeaveStatus.PENDING
        },
        include: { employee: true }
    });

    // ASYNC EVENT: Notify Department Head
    eventBus.emit(AppEvents.LEAVE_REQUEST_CREATED, {
        ...request,
        startDate: request.startDate, // Date objects are passed as is
        endDate: request.endDate
    });

    return request;
};

export const getEmployeeRequests = async (employeeId: number) => {
    return prisma.leaveRequest.findMany({
        where: { employeeId },
        orderBy: { createdAt: 'desc' }
    });
};

// For Department Heads - filtered by department
export const getPendingRequests = async (approverDepartment: string) => {
    return prisma.leaveRequest.findMany({
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
    return prisma.leaveRequest.findMany({
        where: { status: LeaveStatus.PENDING },
        include: { employee: true },
        orderBy: { createdAt: 'asc' }
    });
};

export const approveRequest = async (requestId: number, approverId: number, approverDepartment: string, comment?: string) => {
    return prisma.$transaction(async (tx) => {
        const request = await tx.leaveRequest.findUnique({
            where: { id: requestId },
            include: { employee: true }
        });
        if (!request) throw new Error('Request not found');
        if (request.status !== LeaveStatus.PENDING) throw new Error('Request is not pending');

        // Department-scoped authorization check
        if (request.employee.department !== approverDepartment) {
            throw new Error('Cannot approve requests from other departments');
        }

        // Self-approval prevention
        if (request.employeeId === approverId) {
            throw new Error('Cannot approve your own request');
        }

        const year = request.startDate.getFullYear();

        // Determine which balance field to update based on leave type
        const balanceFieldMap: Partial<Record<LeaveType, string>> = {
            [LeaveType.ANNUAL]: 'annualBalance',
            [LeaveType.SICK]: 'sickBalance',
            [LeaveType.MATERNITY]: 'maternityBalance',
            [LeaveType.PATERNITY]: 'paternityBalance',
        };

        const balanceField = balanceFieldMap[request.leaveType];

        // UNPAID leave doesn't require balance deduction
        if (!balanceField) {
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
        }

        // ATOMIC OPERATION: Update balance only if sufficient balance exists
        // This prevents race conditions by using a WHERE clause
        const updateResult = await tx.leaveBalance.updateMany({
            where: {
                employeeId: request.employeeId,
                year,
                [balanceField]: { gte: request.days } // Only update if balance >= days
            },
            data: {
                [balanceField]: { decrement: request.days }
            }
        });

        // If no rows were updated, it means insufficient balance
        if (updateResult.count === 0) {
            throw new Error('Insufficient leave balance');
        }

        // Update Request Status
        const updatedRequest = await tx.leaveRequest.update({
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

        // ASYNC EVENT: Notify User
        eventBus.emit(AppEvents.LEAVE_REQUEST_APPROVED, {
            requestId: updatedRequest.id,
            comment
        });

        return updatedRequest;
    }, {
        isolationLevel: 'Serializable' // Strongest isolation level for critical operations
    });
};

export const rejectRequest = async (requestId: number, approverId: number, approverDepartment: string, comment?: string) => {
    const request = await prisma.leaveRequest.findUnique({
        where: { id: requestId },
        include: { employee: true }
    });
    if (!request) throw new Error('Request not found');
    if (request.status !== LeaveStatus.PENDING) {
        throw new Error(`Cannot reject leave request. Current status: ${request.status}`);
    }

    // Department-scoped authorization check
    if (request.employee.department !== approverDepartment) {
        throw new Error('Cannot reject requests from other departments');
    }

    // Self-approval prevention
    if (request.employeeId === approverId) {
        throw new Error('Cannot reject your own request');
    }

    const updatedRequest = await prisma.leaveRequest.update({
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

    // ASYNC EVENT: Notify User
    eventBus.emit(AppEvents.LEAVE_REQUEST_REJECTED, {
        requestId: updatedRequest.id,
        comment
    });

    return updatedRequest;
};
