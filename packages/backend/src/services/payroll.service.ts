
import { endOfMonth, differenceInDays, isSameMonth } from 'date-fns';
import { prisma } from '../lib/prisma';
import { LeaveType } from '@prisma/client';
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
            payrollTransfers: {
                where: {
                    leaveId: { not: null },
                    leave: {
                        startDate: { lte: endPeriod },
                        endDate: { gte: startPeriod }
                    }
                },
                include: { leave: true }
            }
        }
    });

    // Step 2: Get Exited Employees (Clearance approved in this month)
    // We can find this via ClearanceRequest approvedAt (if we had it on main) or check ClearnaceCheck/etc.
    // Easier: Check ClearanceRequest updated at + status = APPROVED
    // Or check PayrollTransfer effectiveDate
    const exitedEmployees = await prisma.employee.findMany({
        where: {
            ...campusFilter,
            payrollTransfers: {
                some: {
                    effectiveDate: {
                        gte: startPeriod,
                        lte: endPeriod
                    },
                    status: { not: 'CANCELLED' }, // Assuming created ones are valid
                    leaveId: null // We only want clearance-related exits here
                }
            },
            user: { isActive: false } // Only those who are now inactive
        },
        include: {
            user: true,
            payrollTransfers: {
                where: {
                    effectiveDate: { gte: startPeriod, lte: endPeriod },
                    leaveId: null
                },
                take: 1
            }
        }
    });

    // Combine lists (avoid dupes if any edge case)
    const allEmployees = [...activeEmployees, ...exitedEmployees];

    // Map to result format
    const results = allEmployees.map(emp => {
        let payableDays = PAYROLL_CONSTANTS.STANDARD_MONTH_DAYS; // Default Standard
        const daysInMonth = endPeriod.getDate(); // 28, 29, 30, 31

        // Case A: New Hire this month?
        // If hireDate is in this month
        if (isSameMonth(emp.hireDate, startPeriod) && emp.hireDate.getFullYear() === year) {
            // Days from hireDate to end of month (inclusive)
            payableDays = differenceInDays(endPeriod, emp.hireDate) + 1;
        }

        // Case B: Exited this month?
        // If they are in exited list (active=false)
        if (!emp.user.isActive) {
            // Find termination date. 
            // We can use the payroll transfer effective date as the "Last Pay Day" equivalent
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const transfer = (emp as any).payrollTransfers?.[0];
            if (transfer) {
                const exitDate = transfer.effectiveDate;
                // Days from start of month to exit date
                payableDays = differenceInDays(exitDate, startPeriod) + 1;
            }
        }

        // Case C: Leave Deduction
        let leaveNotes = '';
        if (emp.user.isActive && emp.payrollTransfers && emp.payrollTransfers.length > 0) {
            for (const pt of emp.payrollTransfers) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const leave = (pt as any).leave;
                if (leave && ([LeaveType.UNPAID, LeaveType.SABBATICAL, LeaveType.RESEARCH] as LeaveType[]).includes(leave.leaveType)) {
                    const overlapStart = leave.startDate > startPeriod ? leave.startDate : startPeriod;
                    const overlapEnd = leave.endDate < endPeriod ? leave.endDate : endPeriod;
                    if (overlapStart <= overlapEnd) {
                        const leaveDays = differenceInDays(overlapEnd, overlapStart) + 1;
                        payableDays -= leaveDays;
                        leaveNotes += `Deducted ${leaveDays} days for ${leave.leaveType} leave. `;
                    }
                }
            }
        }

        // Cap payable days just in case
        if (payableDays < 0) payableDays = 0;
        if (payableDays > daysInMonth) payableDays = daysInMonth;

        // Standardize 31st day handling? "HR provides days".
        // Rule: If worked full month -> 30.
        // If partial -> Actual calendar days.
        if (payableDays >= PAYROLL_CONSTANTS.MINIMUM_FULL_MONTH_DAYS && payableDays === daysInMonth) {
            payableDays = PAYROLL_CONSTANTS.STANDARD_MONTH_DAYS; // Standardize full month to 30
        }

        let finalNotes = '';
        if (!emp.user.isActive) {
            finalNotes = 'Partial Payment - Exited this month';
        } else if (payableDays < 30 && payableDays !== 30 && isSameMonth(emp.hireDate, startPeriod) && emp.hireDate.getFullYear() === year) {
            finalNotes = 'Partial Payment - New Hire';
        }

        if (leaveNotes) {
            finalNotes = finalNotes ? `${finalNotes} | ${leaveNotes.trim()}` : leaveNotes.trim();
        }

        return {
            employeeId: emp.employeeId,
            fullName: emp.name,
            department: emp.deptLegacy,
            grossSalary: emp.grossSalary,
            salaryType: emp.salaryType,
            payableDays: payableDays,
            status: emp.user.isActive ? 'ACTIVE' : 'EXITED',
            notes: finalNotes || ''
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

/**
 * Finance Officer: get all leave-based payroll notifications (RESEARCH, UNPAID, SABBATICAL).
 * Returns full information: employee details, leave type, dates, days, salary impact.
 */
export const getLeavePayrollTransfers = async (campusId?: number) => {
    const records = await prisma.payrollTransfer.findMany({
        where: {
            leaveId: { not: null },
            ...(campusId != null ? { employee: { campusId } } : {})
        },
        include: {
            employee: {
                select: {
                    employeeId: true,
                    name: true,
                    deptLegacy: true,
                    position: true,
                    grossSalary: true,
                    salaryType: true,
                    campusId: true,
                    campus: { select: { name: true } }
                }
            },
            leave: {
                select: {
                    id: true,
                    leaveType: true,
                    startDate: true,
                    endDate: true,
                    days: true,
                    reason: true,
                    status: true,
                    approverComment: true,
                    resolvedAt: true,
                }
            }
        },
        orderBy: { createdAt: 'desc' }
    });

    return records.map(r => {
        const leave = (r as any).leave;
        const emp = r.employee;
        const dailyRate = emp.grossSalary / PAYROLL_CONSTANTS.STANDARD_MONTH_DAYS;
        const affectedDays = leave?.days ?? 0;
        const salaryImpact = leave?.leaveType === 'UNPAID' ? -(dailyRate * affectedDays) : 0;

        return {
            id: r.id,
            transferId: r.id,
            status: r.status,
            effectiveDate: r.effectiveDate,
            createdAt: r.createdAt,
            reason: r.reason,
            employee: {
                employeeId: emp.employeeId,
                name: emp.name,
                department: emp.deptLegacy,
                position: emp.position,
                grossSalary: emp.grossSalary,
                salaryType: emp.salaryType,
                campus: emp.campus,
            },
            leave: leave ? {
                id: leave.id,
                leaveType: leave.leaveType,
                startDate: leave.startDate,
                endDate: leave.endDate,
                days: leave.days,
                reason: leave.reason,
                approverComment: leave.approverComment,
                resolvedAt: leave.resolvedAt,
            } : null,
            salaryInfo: leave?.leaveType === 'UNPAID'
                    ? `Unpaid leave: ${affectedDays} days deducted at ${dailyRate.toFixed(2)} ETB/day`
                    : leave?.leaveType === 'SABBATICAL'
                        ? 'Sabbatical leave: salary paid as per institutional policy'
                        : leave?.leaveType === 'RESEARCH'
                            ? 'Research leave: salary paid as per institutional policy'
                            : 'No salary impact',
            salaryImpact: {
                dailyRate: parseFloat(dailyRate.toFixed(2)),
                affectedDays,
                salaryDeduction: parseFloat(salaryImpact.toFixed(2)),
                note: leave?.leaveType === 'UNPAID'
                    ? `Unpaid leave: ${affectedDays} days deducted at ${dailyRate.toFixed(2)} ETB/day`
                    : leave?.leaveType === 'SABBATICAL'
                        ? 'Sabbatical leave: salary paid as per institutional policy'
                        : leave?.leaveType === 'RESEARCH'
                            ? 'Research leave: salary paid as per institutional policy'
                            : 'No salary impact'
            }
        };
    });
};
