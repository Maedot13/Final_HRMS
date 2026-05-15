import * as XLSX from 'xlsx';
import {
    Document, Packer, Paragraph, Table, TableRow, TableCell,
    TextRun, AlignmentType, BorderStyle, WidthType, HeadingLevel,
} from 'docx';
import { endOfMonth, differenceInDays, isSameMonth, format } from 'date-fns';
import path from 'path';
import fs from 'fs';
import { prisma } from '../lib/prisma';
import { PAYROLL_CONSTANTS } from '../config/constants';
import { logger } from '../utils/logger';

interface ReportParams {
    month?: number;
    year?: number;
    campusId?: number;
}

interface PayrollRow {
    'Employee ID': string;
    'Full Name': string;
    'Position': string;
    'Gross Salary': number;
    'Payable Days': number;
    'Status': string;
}

async function fetchPayrollRows(params: ReportParams): Promise<{ rows: PayrollRow[]; period: { month: number; year: number } }> {
    const today = new Date();
    const year = params.year || today.getFullYear();
    const monthIndex = params.month ? params.month - 1 : today.getMonth();
    const startPeriod = new Date(year, monthIndex, 1);
    const endPeriod = endOfMonth(startPeriod);
    const campusFilter = params.campusId != null ? { campusId: params.campusId } : {};

    const activeEmployees = await prisma.employee.findMany({
        where: { ...campusFilter, user: { isActive: true } },
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
        },
    });

    const exitedEmployees = await prisma.employee.findMany({
        where: {
            ...campusFilter,
            payrollTransfers: {
                some: { effectiveDate: { gte: startPeriod, lte: endPeriod }, status: { not: 'CANCELLED' } },
            },
            user: { isActive: false },
        },
        include: {
            user: true,
            payrollTransfers: { where: { effectiveDate: { gte: startPeriod, lte: endPeriod } }, take: 1 },
            leaveRequests: {
                where: {
                    status: 'APPROVED',
                    leaveType: 'UNPAID',
                    OR: [
                        { startDate: { lte: endPeriod }, endDate: { gte: startPeriod } }
                    ]
                }
            }
        },
    });

    const allEmployees = [...activeEmployees, ...exitedEmployees];

    const rows: PayrollRow[] = allEmployees.map((emp) => {
        let payableDays = PAYROLL_CONSTANTS.STANDARD_MONTH_DAYS;
        const daysInMonth = endPeriod.getDate();

        if (isSameMonth(emp.hireDate, startPeriod) && emp.hireDate.getFullYear() === year) {
            payableDays = differenceInDays(endPeriod, emp.hireDate) + 1;
        }
        if (!emp.user.isActive) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const transfer = (emp as any).payrollTransfers?.[0];
            if (transfer) payableDays = differenceInDays(transfer.effectiveDate, startPeriod) + 1;
        }

        // Deduct UNPAID Leave Days
        let unpaidDays = 0;
        emp.leaveRequests.forEach((leave) => {
            const overlapStart = leave.startDate > startPeriod ? leave.startDate : startPeriod;
            const overlapEnd = leave.endDate < endPeriod ? leave.endDate : endPeriod;
            const days = differenceInDays(overlapEnd, overlapStart) + 1;
            if (days > 0) unpaidDays += days;
        });

        payableDays -= unpaidDays;

        if (payableDays < 0) payableDays = 0;
        if (payableDays > daysInMonth) payableDays = daysInMonth;
        if (payableDays >= PAYROLL_CONSTANTS.MINIMUM_FULL_MONTH_DAYS && payableDays === daysInMonth && unpaidDays === 0)
            payableDays = PAYROLL_CONSTANTS.STANDARD_MONTH_DAYS;

        return {
            'Employee ID': emp.employeeId,
            'Full Name': emp.name,
            'Position': emp.position,
            'Gross Salary': emp.grossSalary ?? 0,
            'Payable Days': payableDays,
            'Status': unpaidDays > 0 ? 'ON_LEAVE' : (emp.user.isActive ? 'ACTIVE' : 'EXITED'),
        };
    });

    return { rows, period: { month: monthIndex + 1, year } };
}

/**
 * Build a valid XLSX buffer using SheetJS.
 * Columns: Employee ID, Full Name, Position, Gross Salary, Payable Days, Status
 */
function buildXlsxBuffer(rows: PayrollRow[], period: { month: number; year: number }): Buffer {
    const wb = XLSX.utils.book_new();

    // Title row then data
    const periodLabel = format(new Date(period.year, period.month - 1), 'MMMM yyyy');
    const titleRow = [`Payroll Report — ${periodLabel}`, '', '', '', '', ''];
    const genRow = [`Generated: ${format(new Date(), 'dd MMM yyyy HH:mm')}`, '', '', '', '', ''];
    const emptyRow = ['', '', '', '', '', ''];
    const headerRow = ['Employee ID', 'Full Name', 'Position', 'Gross Salary', 'Payable Days', 'Status'];

    const sheetData = [
        titleRow,
        genRow,
        emptyRow,
        headerRow,
        ...rows.map(r => [r['Employee ID'], r['Full Name'], r['Position'], r['Gross Salary'], r['Payable Days'], r['Status']]),
        emptyRow,
        ['', '', '', 'Total Employees:', rows.length, ''],
    ];

    const ws = XLSX.utils.aoa_to_sheet(sheetData);

    // Column widths
    ws['!cols'] = [
        { wch: 16 }, { wch: 28 }, { wch: 24 }, { wch: 16 }, { wch: 14 }, { wch: 12 },
    ];

    XLSX.utils.book_append_sheet(wb, ws, 'Payroll');

    // Write as binary buffer
    const raw = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    return Buffer.from(raw);
}

/** POST /payroll/generate — HR_OFFICER download Excel directly */
export async function generatePayrollExcel(params: ReportParams): Promise<Buffer> {
    const { rows, period } = await fetchPayrollRows(params);
    logger.info(`[Payroll] Generating Excel for ${rows.length} employees, ${period.month}/${period.year}`);
    return buildXlsxBuffer(rows, period);
}

/** POST /payroll/send-to-finance — save XLSX to disk + DB record */
export async function sendPayrollToFinance(params: ReportParams, sentById: number): Promise<{ id: number; filename: string; count: number }> {
    const { rows, period } = await fetchPayrollRows(params);
    const buffer = buildXlsxBuffer(rows, period);

    const uploadsDir = path.join(process.cwd(), 'uploads', 'payroll');
    if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

    const filename = `Payroll_${period.year}_${String(period.month).padStart(2, '0')}_${Date.now()}.xlsx`;
    const filePath = path.join(uploadsDir, filename);
    fs.writeFileSync(filePath, buffer);

    const record = await prisma.payrollReport.create({
        data: { month: period.month, year: period.year, filename, filePath, sentById, campusId: params.campusId ?? null },
    });

    logger.info(`[Payroll] Saved report #${record.id} to ${filePath} (${rows.length} employees)`);
    return { id: record.id, filename, count: rows.length };
}

/** GET /payroll/reports — list all sent reports (Finance sees all; campusId=undefined means no filter) */
export async function listPayrollReports(campusId?: number) {
    // If campusId provided, filter; otherwise return all (UNIVERSITY scope or Finance)
    const where = campusId != null ? { campusId } : {};
    return prisma.payrollReport.findMany({ where, orderBy: { createdAt: 'desc' } });
}

/** GET /payroll/reports/:id/download — stream saved XLSX */
export async function getPayrollReportFile(id: number): Promise<{ filePath: string; filename: string } | null> {
    const record = await prisma.payrollReport.findUnique({ where: { id } });
    if (!record || !record.filePath || !record.filename || !fs.existsSync(record.filePath)) return null;
    return { filePath: record.filePath, filename: record.filename };
}

// ─── Aliases for Controller Compatibility ────────────────────────────────────

/** Alias for generatePayrollExcel as buffer */
export const generateExcelBuffer = (data: any) => {
    const rows = data.map((d: any) => ({
        'Employee ID': d.employeeId,
        'Full Name': d.fullName,
        'Position': d.department, // Note: controller/service mismatch in naming
        'Gross Salary': d.grossSalary,
        'Payable Days': d.payableDays,
        'Status': d.status
    }));
    return buildXlsxBuffer(rows, { month: new Date().getMonth() + 1, year: new Date().getFullYear() });
};

/** Alias for sendPayrollToFinance */
export const sendToFinance = async (params: { month: number; year: number; campusId: number; userId: number }) => {
    return sendPayrollToFinance({ month: params.month, year: params.year, campusId: params.campusId }, params.userId);
};

/** Alias for listPayrollReports */
export const listReports = async (campusId: number) => {
    return listPayrollReports(campusId);
};

/** Alias for findUnique */
export const getReportById = async (id: number) => {
    return prisma.payrollReport.findUnique({ where: { id } });
};

/** Alias for path joining */
export const getAbsoluteFilePath = (reportUrl: string) => {
    return path.join(process.cwd(), 'uploads', 'payroll', path.basename(reportUrl));
};

/** POST /payroll/penalty — DOCX penalty report (unchanged) */
export async function generatePenaltyDocx(params: ReportParams): Promise<Buffer> {
    const { rows, period } = await fetchPayrollRows(params);
    const penaltyRows = rows.filter((r) => r['Payable Days'] < PAYROLL_CONSTANTS.STANDARD_MONTH_DAYS);
    const periodLabel = format(new Date(period.year, period.month - 1), 'MMMM yyyy');
    const generatedDate = format(new Date(), 'dd MMM yyyy');

    const headerCells = ['No.', 'Employee ID', 'Full Name', 'Position', 'Reason', 'Deduction Days'].map(
        (text) => new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text, bold: true, size: 20, font: 'Calibri' })] })],
        })
    );
    const dataRows = penaltyRows.map((row, idx) => {
        const deductionDays = PAYROLL_CONSTANTS.STANDARD_MONTH_DAYS - row['Payable Days'];
        const reason = row['Status'] === 'EXITED' ? 'Clearance / Exit' : 'New Hire (Partial)';
        return new TableRow({
            children: [
                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: String(idx + 1), size: 20, font: 'Calibri' })] })] }),
                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: row['Employee ID'], size: 20, font: 'Calibri' })] })] }),
                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: row['Full Name'], size: 20, font: 'Calibri' })] })] }),
                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: row['Position'], size: 20, font: 'Calibri' })] })] }),
                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: reason, size: 20, font: 'Calibri' })] })] }),
                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: String(deductionDays), size: 20, font: 'Calibri' })] })] }),
            ],
        });
    });

    const table = new Table({
        rows: [new TableRow({ children: headerCells }), ...dataRows],
        width: { size: 100, type: WidthType.PERCENTAGE },
        borders: {
            top: { style: BorderStyle.SINGLE, size: 1 }, bottom: { style: BorderStyle.SINGLE, size: 1 },
            left: { style: BorderStyle.SINGLE, size: 1 }, right: { style: BorderStyle.SINGLE, size: 1 },
            insideHorizontal: { style: BorderStyle.SINGLE, size: 1 }, insideVertical: { style: BorderStyle.SINGLE, size: 1 },
        },
    });

    const doc = new Document({
        sections: [{
            children: [
                new Paragraph({ children: [new TextRun({ text: 'Penalty Report', bold: true, size: 32, font: 'Calibri' })], alignment: AlignmentType.CENTER, heading: HeadingLevel.HEADING_1, spacing: { after: 100 } }),
                new Paragraph({ children: [new TextRun({ text: `Period: ${periodLabel}`, size: 22, font: 'Calibri' })], alignment: AlignmentType.CENTER, spacing: { after: 60 } }),
                new Paragraph({ children: [new TextRun({ text: `Generated: ${generatedDate}`, italics: true, size: 18, font: 'Calibri', color: '666666' })], alignment: AlignmentType.CENTER, spacing: { after: 300 } }),
                new Paragraph({ children: [new TextRun({ text: `Employees with deductions for ${periodLabel}. Total: ${penaltyRows.length} employee(s).`, size: 20, font: 'Calibri' })], spacing: { after: 200 } }),
                table,
                new Paragraph({ children: [], spacing: { before: 400 } }),
                new Paragraph({ children: [new TextRun({ text: 'Prepared by: ________________________', size: 20, font: 'Calibri' })], spacing: { after: 100 } }),
                new Paragraph({ children: [new TextRun({ text: 'HR Officer', size: 20, font: 'Calibri', italics: true })] }),
            ],
        }],
    });

    const buffer = await Packer.toBuffer(doc);
    logger.info(`[Penalty] DOCX with ${penaltyRows.length} rows for ${period.month}/${period.year}`);
    return buffer;
}
