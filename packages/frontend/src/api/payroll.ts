
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
        })
};
