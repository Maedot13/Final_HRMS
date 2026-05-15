import apiClient from './client';

export interface PayrollReportRecord {
    id: number;
    month: number;
    year: number;
    filename: string;
    sentById: number;
    campusId: number | null;
    createdAt: string;
}

export interface PayrollTransfer {
    id: number;
    employeeId: number;
    reason: string;
    salaryInfo?: string;
    effectiveDate: string;
    status: string;
    createdAt: string;
    employee: {
        name: string;
        employeeId: string;
        campus: { name: string };
    };
    leave?: { id: number; leaveType: string };
}

export const payrollApi = {
    /** HR_OFFICER: Preview/download Excel directly */
    generateExcel: (params: { month?: number; year?: number }) =>
        apiClient.post('/payroll/generate', params, { responseType: 'blob' }),

    /** HR_OFFICER: Save to server and notify Finance */
    sendToFinance: (params: { month?: number; year?: number }) =>
        apiClient.post('/payroll/send-to-finance', params),

    /** Finance/HR: List all sent reports */
    listReports: () =>
        apiClient.get<PayrollReportRecord[]>('/payroll/reports'),

    /** Finance/HR: Download a specific saved report */
    downloadReport: (id: number) =>
        apiClient.get(`/payroll/reports/${id}/download`, { responseType: 'blob' }),

    /** HR_OFFICER: Download DOCX penalty report */
    generatePenaltyDocx: (params: { month?: number; year?: number }) =>
        apiClient.post('/payroll/penalty', params, { responseType: 'blob' }),

    /** Finance/HR: List all status changes/transfers */
    listTransfers: () =>
        apiClient.get<PayrollTransfer[]>('/payroll/transfers'),
};
