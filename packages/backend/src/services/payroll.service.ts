
import { endOfMonth, differenceInDays, isSameMonth } from 'date-fns';
import { prisma } from '../lib/prisma';
import { PAYROLL_CONSTANTS } from '../config/constants';
import { logger } from '../utils/logger';

interface PayrollDataParams {
    month?: number; // 1-12 for API
    year?: number;
    campusId?: number; // Filter by campus (campus users); omit for university admin (all campuses)
}

export const getPayrollData = async (params: PayrollDataParams) => {
    const today = new Date();
    const year = params.year || today.getFullYear();
    const monthIndex = params.month ? params.month - 1 : today.getMonth(); // 0-based index

    // Define the period
    const startPeriod = new Date(year, monthIndex, 1);
    const endPeriod = endOfMonth(startPeriod);

    // Fetch employees
    // Logic: 
    // 1. Active employees
    // 2. Employees who were active at any point IN this month (e.g. resigned mid-month, or hired mid-month)
    // Simplified query: Fetch all users who are active OR (inactive but updated/exited in this month?)
    // Actually, best to fetch all employees and filter in memory or filtered query.
    // Let's filter by:
    // - isActive = true
    // - OR (clearance completed in this month)

    const campusFilter = params.campusId != null ? { campusId: params.campusId } : {};

    // Step 1: Get Active Employees
    const activeEmployees = await prisma.employee.findMany({
        where: {
            ...campusFilter,
            user: { isActive: true }
        },
        include: { 
            user: true,
            leaveRequests: {
                where: {
                    status: 'APPROVED',
                    leaveType: 'UNPAID',
                    OR: [
                        { startDate: { lte: endPeriod }, endDate: { gte: startPeriod } }
                    ]
                }
            }
        }
    });

    // Step 2: Get Exited Employees
    const exitedEmployees = await prisma.employee.findMany({
        where: {
            ...campusFilter,
            payrollTransfers: {
                some: {
                    effectiveDate: { gte: startPeriod, lte: endPeriod },
                    status: { not: 'CANCELLED' }
                }
            },
            user: { isActive: false }
        },
        include: {
            user: true,
            payrollTransfers: {
                where: { effectiveDate: { gte: startPeriod, lte: endPeriod } },
                take: 1
            },
            leaveRequests: {
                where: {
                    status: 'APPROVED',
                    leaveType: 'UNPAID',
                    OR: [
                        { startDate: { lte: endPeriod }, endDate: { gte: startPeriod } }
                    ]
                }
            }
        }
    });

    // Combine lists
    const allEmployees = [...activeEmployees, ...exitedEmployees];

    // Map to result format
    const results = allEmployees.map(emp => {
        let payableDays = PAYROLL_CONSTANTS.STANDARD_MONTH_DAYS;
        const daysInMonth = endPeriod.getDate();

        // New Hire?
        if (isSameMonth(emp.hireDate, startPeriod) && emp.hireDate.getFullYear() === year) {
            payableDays = differenceInDays(endPeriod, emp.hireDate) + 1;
        }

        // Exited?
        if (!emp.user.isActive) {
            const transfer = (emp as any).payrollTransfers?.[0];
            if (transfer) {
                const exitDate = transfer.effectiveDate;
                payableDays = differenceInDays(exitDate, startPeriod) + 1;
            }
        }

        // Deduct UNPAID Leave Days
        let unpaidDays = 0;
        emp.leaveRequests.forEach(leave => {
            const overlapStart = leave.startDate > startPeriod ? leave.startDate : startPeriod;
            const overlapEnd = leave.endDate < endPeriod ? leave.endDate : endPeriod;
            const days = differenceInDays(overlapEnd, overlapStart) + 1;
            if (days > 0) unpaidDays += days;
        });

        payableDays -= unpaidDays;

        // Cap and Standardize
        if (payableDays < 0) payableDays = 0;
        if (payableDays > daysInMonth) payableDays = daysInMonth;

        if (payableDays >= PAYROLL_CONSTANTS.MINIMUM_FULL_MONTH_DAYS && payableDays === daysInMonth && unpaidDays === 0) {
            payableDays = PAYROLL_CONSTANTS.STANDARD_MONTH_DAYS;
        }

        const isOnLeave = unpaidDays > 0;

        return {
            employeeId: emp.employeeId,
            fullName: emp.name,
            department: emp.deptLegacy,
            grossSalary: emp.grossSalary,
            salaryType: emp.salaryType,
            payableDays: payableDays,
            status: isOnLeave ? 'ON_LEAVE' : (emp.user.isActive ? 'ACTIVE' : 'EXITED'),
            notes: isOnLeave ? `Unpaid Leave (${unpaidDays} days)` : (!emp.user.isActive ? 'Partial Payment - Exited this month' : (payableDays < 30 && payableDays !== 30 ? 'Partial Payment - New Hire' : ''))
        };
    });

    return {
        period: { month: monthIndex + 1, year },
        count: results.length,
        data: results
    };
};

export const triggerClearancePayrollTransfer = async (clearanceId: number, employeeId: number, approverId: number) => {
    try {
        await prisma.payrollTransfer.create({
            data: {
                employeeId,
                clearanceId,
                reason: 'Clearance Completed',
                effectiveDate: new Date(),
                status: 'PENDING',
                createdBy: approverId
            }
        });
        logger.info(`[Payroll Service] Initiated payroll transfer for clearance ${clearanceId}`);
    } catch (error) {
        logger.error(`[Payroll Service] Failed to initiate payroll transfer for clearance ${clearanceId}`, error);
        throw error;
    }
};

export const triggerLeavePayrollTransfer = async (leaveId: number, employeeId: number, leaveType: string, approverId: number) => {
    try {
        await prisma.payrollTransfer.create({
            data: {
                employeeId,
                leaveId,
                reason: `${leaveType} Leave Approved`,
                effectiveDate: new Date(),
                status: 'PENDING',
                createdBy: approverId
            }
        });
        logger.info(`[Payroll Service] Initiated payroll transfer for leave ${leaveId}`);
    } catch (error) {
        logger.error(`[Payroll Service] Failed to initiate payroll transfer for leave ${leaveId}`, error);
        throw error;
    }
};

export const listTransfers = async (campusId?: number) => {
    return prisma.payrollTransfer.findMany({
        where: campusId ? { employee: { campusId } } : {},
        include: {
            employee: { select: { name: true, employeeId: true, campus: { select: { name: true } } } },
            clearance: { select: { id: true } },
            leave: { select: { id: true, leaveType: true } }
        },
        orderBy: { createdAt: 'desc' }
    });
};
