import apiClient from './client';

export interface ClearanceRequestPayload {
    targetEmployeeId: string;
    reason: string;
    lastWorkingDay: string; // ISO Date
}

export interface ClearanceUnit {
    id: number;
    name: string;
    description: string | null;
    isActive: boolean;
    campusId: number | null;
    isSystemGenerated: boolean;
    priorityOrder: number;
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

    processCheck: (requestId: number, unitId: number, data: { status: 'APPROVED' | 'REJECTED'; comment?: string }) => {
        if (data.status === 'APPROVED') {
            return apiClient.patch(`/clearance/requests/${requestId}/approve-check`, { unitId, comment: data.comment });
        } else {
            return apiClient.patch(`/clearance/requests/${requestId}/reject-check`, { unitId, comment: data.comment });
        }
    },

    // Get pending checks for a unit
    getPendingChecksForUnit: (unitId: number) => apiClient.get(`/clearance/units/${unitId}/pending`),

    // Units CRUD
    listUnits: () => apiClient.get<ClearanceUnit[]>('/clearance/units'),
    createUnit: (data: { name: string; description?: string }) => apiClient.post<ClearanceUnit>('/clearance/units', data),
    updateUnit: (unitId: number, data: { name?: string; fullName?: string; description?: string; isActive?: boolean; priorityOrder?: number }) => apiClient.patch<ClearanceUnit>(`/clearance/units/${unitId}`, data),
    deleteUnit: (unitId: number) => apiClient.delete(`/clearance/units/${unitId}`),

    // Head HR — final approval queue (status HR_APPROVED = all campus HRs signed off)
    listPendingFinalApproval: () => apiClient.get('/clearance/requests', { params: { status: 'HR_APPROVED' } }),
    finalApprove: (requestId: number, data: { action: 'APPROVE' | 'REJECT'; reason?: string }) =>
        apiClient.patch(`/clearance/requests/${requestId}/final-approve`, data),
};
