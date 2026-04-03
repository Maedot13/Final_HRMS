import apiClient from './client';

export const auditApi = {
    // List audit logs
    list: (params?: { entityType?: string; action?: string; userId?: number; limit?: number; offset?: number }) =>
        apiClient.get('/audit-logs', { params }),

    // Get specific audit log details
    getById: (id: number) => apiClient.get(`/audit-logs/${id}`),
};
