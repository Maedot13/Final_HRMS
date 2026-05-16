import apiClient from './client';
import type { Department } from '../types';

/** Safely extract an array from the backend's { success, data } envelope. */
function extractArray<T>(res: { data: unknown }): T[] {
    const raw = res.data as any;
    if (Array.isArray(raw)) return raw as T[];
    if (raw && Array.isArray(raw.data)) return raw.data as T[];
    return [];
}

export const departmentApi = {
    list: async (): Promise<{ data: Department[] }> => {
        const res = await apiClient.get<Department[]>('/departments');
        return { data: extractArray<Department>(res) };
    },

    getById: (id: number) => apiClient.get<Department>(`/departments/${id}`),

    create: (data: { name: string; headEmployeeId?: string }) =>
        apiClient.post<Department>('/departments', data),

    update: (id: number, data: { name?: string }) =>
        apiClient.patch<Department>(`/departments/${id}`, data),

    assignHead: (id: number, employeeId: string) =>
        apiClient.patch<Department>(`/departments/${id}/head`, { employeeId }),

    delete: (id: number) => apiClient.delete(`/departments/${id}`),
};
