import apiClient from './client';

export interface ClearanceRequestPayload {
    reason: string;
    lastWorkingDay: string; // ISO Date
}

export const clearanceApi = {
    // List clearance requests (with optional filters)
    list: (params?: { status?: string; limit?: number; offset?: number }) =>
        apiClient.get('/clearance/requests', { params }),

    // Get specific clearance request details
    getById: (id: number) => apiClient.get(`/clearance/requests/${id}`),

    // Initiate a new clearance request
    initiate: (data: ClearanceRequestPayload) => apiClient.post('/clearance/requests', data),

    // Approve a clearance check for a specific unit
    approveCheck: (requestId: number, unitId: number, comment?: string) =>
        apiClient.patch(`/clearance/requests/${requestId}/approve-check`, { unitId, comment }),

    // Reject a clearance check for a specific unit
    rejectCheck: (requestId: number, unitId: number, comment: string) =>
        apiClient.patch(`/clearance/requests/${requestId}/reject-check`, { unitId, comment }),

    // Combined helper for backwards-compatible processCheck calls
    processCheck: (requestId: number, unitId: number, data: { status: 'APPROVED' | 'REJECTED'; comment?: string }) => {
        if (data.status === 'APPROVED') {
            return apiClient.patch(`/clearance/requests/${requestId}/approve-check`, { unitId, comment: data.comment });
        } else {
            return apiClient.patch(`/clearance/requests/${requestId}/reject-check`, { unitId, comment: data.comment });
        }
    },
};
