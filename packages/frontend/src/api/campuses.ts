import apiClient from './client';
import type { Campus, CampusReadiness } from '../types';

export const campusApi = {
    list: (activeOnly?: boolean) =>
        apiClient.get<Campus[]>('/campuses', { params: activeOnly ? { active: 'true' } : undefined }),

    getById: (id: number) => apiClient.get<Campus>(`/campuses/${id}`),

    getReadiness: (id: number) => apiClient.get<CampusReadiness>(`/campuses/${id}/readiness`),

    create: (data: {
        code: string;
        name: string;
        description?: string;
        timezone?: string;
        employeeIdPrefix: string;
        employeeNumericLength: number;
        initialAdmin: { employeeId: string; email: string; name: string; password?: string };
    }) => apiClient.post<{ campus: Campus; adminEmployeeId: string; tempPassword?: string; warning?: string }>('/campuses', data),

    update: (id: number, data: Partial<{ name: string; description: string | null; isActive: boolean; timezone: string; employeeIdPrefix: string; employeeNumericLength: number }>) =>
        apiClient.patch<Campus>(`/campuses/${id}`, data),

    getUsers: (id: number) =>
        apiClient.get<{ campus: { id: number; code: string; name: string }; users: Array<{ id: number; employeeId: string; email: string; role: string; employee?: { name: string; deptLegacy?: string } }> }>(`/campuses/${id}/users`),
};
