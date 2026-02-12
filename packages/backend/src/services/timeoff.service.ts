
import { LeaveStatus } from '@prisma/client';
import { differenceInYears } from 'date-fns';
import { prisma } from '../lib/prisma';


export const checkOverlappingRequests = async (employeeId: number, startDate: Date, endDate: Date): Promise<void> => {
    // Check LeaveRequests
    const overlappingLeave = await prisma.leaveRequest.findFirst({
        where: {
            employeeId,
            status: { in: [LeaveStatus.PENDING, LeaveStatus.APPROVED] },
            OR: [
                {
                    startDate: { lte: endDate },
                    endDate: { gte: startDate }
                }
            ]
        }
    });

    if (overlappingLeave) {
        throw new Error('Overlapping leave request already exists (Pending or Approved)');
    }

    // Check SabbaticalRequests
    const overlappingSabbatical = await prisma.sabbaticalRequest.findFirst({
        where: {
            employeeId,
            status: { in: [LeaveStatus.PENDING, LeaveStatus.APPROVED] },
            OR: [
                {
                    startDate: { lte: endDate },
                    endDate: { gte: startDate }
                }
            ]
        }
    });

    if (overlappingSabbatical) {
        throw new Error('Overlapping sabbatical request already exists (Pending or Approved)');
    }
};

export const checkSabbaticalEligibility = async (employeeId: number): Promise<void> => {
    const employee = await prisma.employee.findUnique({
        where: { id: employeeId }
    });

    if (!employee) throw new Error('Employee not found');

    // Rule 1: 7 years of service
    if (employee.serviceYears < 7) {
        throw new Error(`Sabbatical requires 7 years of service. Current: ${employee.serviceYears}`);
    }

    // Rule 2: 7-year cooldown since last sabbatical (Approved/Completed)
    const lastSabbatical = await prisma.sabbaticalRequest.findFirst({
        where: {
            employeeId,
            status: LeaveStatus.APPROVED
        },
        orderBy: { endDate: 'desc' }
    });

    if (lastSabbatical) {
        const yearsSinceLast = differenceInYears(new Date(), lastSabbatical.endDate);
        if (yearsSinceLast < 7) {
            throw new Error(`Sabbatical cooldown period not met. Last sabbatical ended on ${lastSabbatical.endDate.toDateString()}. Next eligible in ${7 - yearsSinceLast} years.`);
        }
    }
};
