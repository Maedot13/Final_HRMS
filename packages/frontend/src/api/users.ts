import apiClient from './client';
import type { UserListItem, UserDetail } from '../types';

export const usersApi = {
    list: () => apiClient.get<UserListItem[]>('/users'),

    listPaginated: (params?: { cursor?: string; limit?: number; search?: string; role?: string; status?: string }) =>
        apiClient.get<import('../types').PaginatedResponse<UserListItem>>('/users', { params }),

    getById: (id: number) => apiClient.get<UserDetail>(`/users/${id}`),

    updateRole: (id: number, role: string) =>
        apiClient.patch<UserDetail>(`/users/${id}/role`, { role }),

    updateStatus: (id: number, isActive: boolean) =>
        apiClient.patch<UserDetail>(`/users/${id}/status`, { isActive }),

    resetPassword: (id: number) =>
        apiClient.post<{ message: string }>(`/users/${id}/reset-password`),

    create: (data: {
        name: string;
        email: string;
        role: string;
        departmentId?: number;
        department?: string;
    }) => apiClient.post('/auth/register', data),
};
