
import apiClient from './client';

export interface PayrollDataParams {
    month?: number;
    year?: number;
}

export interface PayrollReport {
    id: number;
    month: number;
    year: number;
    reportUrl: string;
    status: string;
    createdAt: string;
    createdBy: {
        employee: {
            name: string;
        }
    }
}

export type PayrollReportRecord = PayrollReport & { filename?: string };

export interface PayrollTransfer {
    id: number;
    transferId: number;
    status: string;
    effectiveDate: string;
    createdAt: string;
    reason: string;
    employee: {
        employeeId: string;
        name: string;
        department: string;
        position: string;
        grossSalary: number;
        salaryType: string;
        campus?: { name: string };
    };
    leave: {
        id: number;
        leaveType: string;
        startDate: string;
        endDate: string;
        days: number;
        reason: string;
        approverComment?: string;
        resolvedAt?: string;
    } | null;
    salaryInfo?: string;
    salaryImpact?: {
        dailyRate: number;
        affectedDays: number;
        salaryDeduction: number;
        note: string;
    };
}

export const payrollApi = {
    // Get payroll data for preview
    getDataTransfer: (params: PayrollDataParams) => 
        apiClient.get('/payroll/data-transfer', { params }),

    // Generate and download Excel directly
    generateExcel: (params: PayrollDataParams) => 
        apiClient.get('/payroll/generate', { 
            params,
            responseType: 'blob' 
        }),

    // Send payroll to finance
    sendToFinance: (data: { month: number; year: number }) => 
        apiClient.post('/payroll/send-to-finance', data),

    // List sent reports
    listReports: () => 
        apiClient.get<PayrollReport[]>('/payroll/reports'),

    // Download a specific report
    downloadReport: (reportId: number) => 
        apiClient.get(`/payroll/reports/${reportId}/download`, {
            responseType: 'blob'
        }),

    // List leave-based payroll transfers for Finance
    listTransfers: () => 
        apiClient.get<PayrollTransfer[]>('/payroll/leave-transfers')
};
