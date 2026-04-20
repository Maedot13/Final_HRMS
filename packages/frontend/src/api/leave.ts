import apiClient from './client';

export interface LeaveRequestPayload {
    leaveType: 'ANNUAL' | 'SICK' | 'MATERNITY' | 'PATERNITY' | 'UNPAID';
    startDate: string; // ISO date
    endDate: string; // ISO date
    reason: string;
    attachmentUrl?: string; // Optional
}

export interface LeaveActionPayload {
    status: 'APPROVED' | 'REJECTED';
    comment?: string;
}

export const leaveApi = {
    // List your own leave requests
    list: (params?: { status?: string; employeeId?: number; limit?: number; offset?: number }) =>
        apiClient.get('/leave', { params }),

    // Get all pending requests for approval
    getPending: (params?: { limit?: number; offset?: number }) =>
        apiClient.get('/leave/pending', { params }),

    // Get specific leave request details
    getById: (id: number) => apiClient.get(`/leave/${id}`),

    // Create a new leave request
    create: (data: LeaveRequestPayload) => apiClient.post('/leave', data),

    // Update a leave request (only if pending)
    update: (id: number, data: Partial<LeaveRequestPayload>) =>
        apiClient.patch(`/leave/${id}`, data),

    // Withdraw a leave request 
    withdraw: (id: number) => apiClient.post(`/leave/${id}/withdraw`),

    // Admin/HR/Head: Approve or Reject
    approve: (id: number, data: { comment?: string }) =>
        apiClient.patch(`/leave/${id}/approve`, data),

    reject: (id: number, data: { comment: string }) =>
        apiClient.patch(`/leave/${id}/reject`, data),

    // Get leave balances for a specific employee
    getBalances: (employeeId: number) => apiClient.get(`/leave/balances/${employeeId}`),
    
    // Get leave balance for the currently logged-in employee (self-service)
    getMyBalance: () => apiClient.get('/leave/balance'),
};
