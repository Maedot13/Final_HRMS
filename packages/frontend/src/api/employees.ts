import apiClient from './client';
import type { EmployeeDetail, EmployeeUpdatePayload } from '../types';

export const employeesApi = {
    getById: (id: number) => apiClient.get<EmployeeDetail>(`/employees/${id}`),

    update: (id: number, data: EmployeeUpdatePayload) =>
        apiClient.patch<EmployeeDetail>(`/employees/${id}`, data),
};
