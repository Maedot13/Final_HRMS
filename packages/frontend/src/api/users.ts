import apiClient from './client';
import type { UserListItem, UserDetail } from '../types';

export const usersApi = {
    list: () => apiClient.get<UserListItem[]>('/users'),

    getById: (id: number) => apiClient.get<UserDetail>(`/users/${id}`),

    updateRole: (id: number, role: string) =>
        apiClient.patch<UserDetail>(`/users/${id}/role`, { role }),

    updateStatus: (id: number, isActive: boolean) =>
        apiClient.patch<UserDetail>(`/users/${id}/status`, { isActive }),

    resetPassword: (id: number) =>
        apiClient.post<{ message: string }>(`/users/${id}/reset-password`),
};
