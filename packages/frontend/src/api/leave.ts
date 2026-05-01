import apiClient from './client';

// ─── Types ────────────────────────────────────────────────────────────────────

export type LeaveTypeName =
    | 'ANNUAL'
    | 'SICK'
    | 'MATERNITY'
    | 'PATERNITY'
    | 'UNPAID'
    | 'PERSONAL'
    | 'STUDY'
    | 'RESEARCH'
    | 'SABBATICAL';

export type LeaveStage = 'DEPT_HEAD' | 'HR_OFFICER' | 'DEAN' | 'VICE_PRESIDENT';

export interface LeaveRequestPayload {
    leaveType: LeaveTypeName;
    startDate: string;
    endDate: string;
    reason: string;
    attachmentUrl?: string;
}

export interface DeptHeadReviewPayload {
    decision: 'APPROVED' | 'REJECTED';
    comment?: string;
}

export interface LeaveActionPayload {
    comment?: string;
}

// ─── API Calls ────────────────────────────────────────────────────────────────

export const leaveApi = {
    // Employee: submit leave request (JSON body — file upload handled via FormData separately)
    create: (data: LeaveRequestPayload) =>
        apiClient.post('/leave/apply', data),

    // Employee: view own leave history
    list: (params?: { status?: string; limit?: number; offset?: number }) =>
        apiClient.get('/leave/my-requests', { params }),

    // Alias kept for backward compat
    getMyRequests: () => apiClient.get('/leave/my-requests'),

    // Any approver role: pending requests (scoped by backend to caller's role/stage)
    getPending: (params?: { limit?: number; offset?: number }) =>
        apiClient.get('/leave/pending', { params }),

    // HR Officer: all campus requests (record-keeping view)
    getAllCampusRequests: () => apiClient.get('/leave/all'),

    // HR Officer: pending for HR stage only
    getHRPending: () => apiClient.get('/leave/pending'),

    // Get details of a single request
    getById: (id: number) => apiClient.get(`/leave/${id}`),

    // Stage 1 — Department Head: approve (forward) or reject
    deptHeadReview: (id: number, data: DeptHeadReviewPayload) =>
        apiClient.patch(`/leave/${id}/dept-head-review`, data),

    // Stage 2 — HR Officer / Dean / VP: final approve
    approve: (id: number, data: LeaveActionPayload = {}) =>
        apiClient.patch(`/leave/${id}/approve`, data),

    // Stage 2 — HR Officer / Dean / VP: final reject
    reject: (id: number, data: { comment: string }) =>
        apiClient.patch(`/leave/${id}/reject`, data),

    // Leave balances
    getMyBalance: () => apiClient.get('/leave/balance'),
    getBalances: (employeeId: number) =>
        apiClient.get(`/leave/balances/${employeeId}`),

    // File upload submit (uses FormData)
    createWithFile: (formData: FormData) =>
        apiClient.post('/leave/apply', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        }),

    // Withdraw (future)
    withdraw: (id: number) => apiClient.post(`/leave/${id}/withdraw`),
};
