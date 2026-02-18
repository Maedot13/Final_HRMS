
import { endOfMonth, differenceInDays, isSameMonth } from 'date-fns';
import { prisma } from '../lib/prisma';
import { PAYROLL_CONSTANTS } from '../config/constants';

interface PayrollDataParams {
    month?: number; // 0-11 (JS Date style) or 1-12? Let's use 1-12 for API, convert internally
    year?: number;
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

    // Step 1: Get Active Employees
    const activeEmployees = await prisma.employee.findMany({
        where: {
            user: { isActive: true }
        },
        include: { user: true }
    });

    // Step 2: Get Exited Employees (Clearance approved in this month)
    // We can find this via ClearanceRequest approvedAt (if we had it on main) or check ClearnaceCheck/etc.
    // Easier: Check ClearanceRequest updated at + status = APPROVED
    // Or check PayrollTransfer effectiveDate
    const exitedEmployees = await prisma.employee.findMany({
        where: {
            payrollTransfers: {
                some: {
                    effectiveDate: {
                        gte: startPeriod,
                        lte: endPeriod
                    },
                    status: { not: 'CANCELLED' } // Assuming created ones are valid
                }
            },
            user: { isActive: false } // Only those who are now inactive
        },
        include: {
            user: true,
            payrollTransfers: {
                where: {
                    effectiveDate: { gte: startPeriod, lte: endPeriod }
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

        // Cap payable days just in case
        if (payableDays < 0) payableDays = 0;
        if (payableDays > daysInMonth) payableDays = daysInMonth;

        // Standardize 31st day handling? "HR provides days".
        // Rule: If worked full month -> 30.
        // If partial -> Actual calendar days.
        if (payableDays >= PAYROLL_CONSTANTS.MINIMUM_FULL_MONTH_DAYS && payableDays === daysInMonth) {
            payableDays = PAYROLL_CONSTANTS.STANDARD_MONTH_DAYS; // Standardize full month to 30
        }

        return {
            employeeId: emp.employeeId,
            fullName: emp.name,
            department: emp.department,
            grossSalary: emp.grossSalary,
            salaryType: emp.salaryType,
            payableDays: payableDays,
            status: emp.user.isActive ? 'ACTIVE' : 'EXITED',
            notes: !emp.user.isActive ? 'Partial Payment - Exited this month' : (payableDays < 30 && payableDays !== 30 ? 'Partial Payment - New Hire' : '')
        };
    });

    return {
        period: { month: monthIndex + 1, year },
        count: results.length,
        data: results
    };
};
