import apiClient from './client';
import type { Department } from '../types';

export const departmentApi = {
    list: () => apiClient.get<Department[]>('/departments'),

    getById: (id: number) => apiClient.get<Department>(`/departments/${id}`),

    create: (data: { name: string; headEmployeeId?: string }) =>
        apiClient.post<Department>('/departments', data),

    update: (id: number, data: { name?: string }) =>
        apiClient.patch<Department>(`/departments/${id}`, data),

    assignHead: (id: number, employeeId: string) =>
        apiClient.patch<Department>(`/departments/${id}/head`, { employeeId }),

    delete: (id: number) => apiClient.delete(`/departments/${id}`),
};
