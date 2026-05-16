import apiClient from './client';
import type { EmployeeDetail, EmployeeUpdatePayload, PaginatedResponse, UserListItem } from '../types';

export const employeesApi = {
    /** List employees (campus-scoped, paginated) */
    list: (params?: { cursor?: string; limit?: number; search?: string; status?: string; departmentId?: number }) =>
        apiClient.get<PaginatedResponse<UserListItem>>('/users', { params }),

    /** Get a single employee by their numeric PK */
    getById: (id: number) => apiClient.get<EmployeeDetail>(`/employees/${id}`),

    /** Create a new employee (department optional) */
    create: (data: {
        name: string;
        email: string;
        role?: string;
        departmentId?: number;
        department?: string;
    }) => apiClient.post('/auth/register', data),

    /** Partial update – supports progressive completion (all fields optional) */
    update: (id: number, data: Partial<EmployeeUpdatePayload>) =>
        apiClient.patch<EmployeeDetail>(`/employees/${id}`, data),

    /** Assign or change the department of an existing employee */
    assignDepartment: (id: number, departmentId: number | null) =>
        apiClient.patch<EmployeeDetail>(`/employees/${id}`, { departmentId: departmentId ?? undefined }),
};
