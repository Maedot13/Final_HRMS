
import * as XLSX from 'xlsx';
import path from 'path';
import fs from 'fs';
import { prisma } from '../lib/prisma';
import { getPayrollData } from './payroll.service';
import { logger } from '../utils/logger';

const PAYROLL_UPLOAD_DIR = path.join(process.cwd(), 'uploads', 'payroll');

/**
 * Ensures the payroll upload directory exists.
 */
const ensureDirExists = () => {
    if (!fs.existsSync(PAYROLL_UPLOAD_DIR)) {
        fs.mkdirSync(PAYROLL_UPLOAD_DIR, { recursive: true });
    }
};

/**
 * Generates an Excel buffer for the given payroll data.
 */
export const generateExcelBuffer = (data: any[]) => {
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Payroll');
    
    // Generate buffer
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    return buffer;
};

/**
 * Sends a payroll report to Finance by saving it to disk and creating a database record.
 */
export const sendToFinance = async (params: { month: number; year: number; campusId: number; userId: number }) => {
    const { month, year, campusId, userId } = params;

    // 1. Check for existing reports to determine version
    const existingCount = await prisma.payrollReport.count({
        where: { month, year, campusId }
    });
    const version = existingCount + 1;
    const versionSuffix = version > 1 ? `_v${version}` : '';

    // 2. Fetch data
    const payrollResult = await getPayrollData({ month, year, campusId });
    
    // 3. Generate Excel
    const buffer = generateExcelBuffer(payrollResult.data);
    
    // 4. Save to disk
    ensureDirExists();
    const filename = `payroll_${campusId}_${year}_${month}${versionSuffix}_${Date.now()}.xlsx`;
    const filePath = path.join(PAYROLL_UPLOAD_DIR, filename);
    fs.writeFileSync(filePath, buffer);
    
    const reportUrl = `payroll/${filename}`;

    // 5. Create DB record
    const report = await prisma.payrollReport.create({
        data: {
            month,
            year,
            campusId,
            createdById: userId,
            reportUrl,
            status: version > 1 ? 'AMENDED' : 'SENT'
        }
    });

    logger.info(`[Payroll Report Service] Report ${report.id} (${version > 1 ? 'Amended' : 'Original'}) sent to finance for campus ${campusId}`);
    return report;
};

/**
 * Lists payroll reports for a campus.
 */
export const listReports = async (campusId: number) => {
    return prisma.payrollReport.findMany({
        where: { campusId },
        orderBy: { createdAt: 'desc' },
        include: {
            createdBy: {
                select: {
                    employee: {
                        select: { name: true }
                    }
                }
            }
        }
    });
};

/**
 * Retrieves a report record by ID.
 */
export const getReportById = async (id: number) => {
    return prisma.payrollReport.findUnique({
        where: { id },
        include: { campus: true }
    });
};

/**
 * Returns the absolute file path for a given report URL.
 */
export const getAbsoluteFilePath = (reportUrl: string) => {
    return path.join(process.cwd(), 'uploads', reportUrl);
};
