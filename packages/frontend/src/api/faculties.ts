import apiClient from './client';

export interface Faculty {
    id: number;
    collegeId: number;
    name: string;
    description?: string;
    deanEmployeeId?: string;
    dean?: { name: string; employeeId: string };
    departments?: any[];
    college?: { id: number; name: string };
}

function extractArray<T>(res: { data: unknown }): T[] {
    const raw = res.data as any;
    if (Array.isArray(raw)) return raw as T[];
    if (raw && Array.isArray(raw.data)) return raw.data as T[];
    return [];
}

export const facultyApi = {
    list: async (collegeId: number): Promise<{ data: Faculty[] }> => {
        const res = await apiClient.get<Faculty[]>(`/faculties?collegeId=${collegeId}`);
        return { data: extractArray<Faculty>(res) };
    },

    /** List all faculties in the admin's campus (no collegeId needed). */
    listByCampus: async (): Promise<Faculty[]> => {
        const res = await apiClient.get<Faculty[]>('/faculties/campus');
        return extractArray<Faculty>(res);
    },

    getById: (id: number) => apiClient.get<Faculty>(`/faculties/${id}`),

    create: (data: { collegeId: number; name: string; description?: string; deanEmployeeId?: string }) =>
        apiClient.post<Faculty>('/faculties', data),

    update: (id: number, data: { name?: string; description?: string }) =>
        apiClient.patch<Faculty>(`/faculties/${id}`, data),

    assignDean: (id: number, employeeId: string | null) =>
        apiClient.patch<Faculty>(`/faculties/${id}/dean`, { employeeId }),

    delete: (id: number) => apiClient.delete(`/faculties/${id}`),
};
