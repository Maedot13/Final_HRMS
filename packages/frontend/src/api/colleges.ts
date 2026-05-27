import apiClient from './client';

export interface College {
    id: number;
    name: string;
    description?: string;
    deanEmployeeId?: string;
    dean?: { name: string; employeeId: string };
    faculties?: any[];
}

function extractArray<T>(res: { data: unknown }): T[] {
    const raw = res.data as any;
    if (Array.isArray(raw)) return raw as T[];
    if (raw && Array.isArray(raw.data)) return raw.data as T[];
    return [];
}

export const collegeApi = {
    list: async (): Promise<{ data: College[] }> => {
        const res = await apiClient.get<College[]>('/colleges');
        return { data: extractArray<College>(res) };
    },

    getById: (id: number) => apiClient.get<College>(`/colleges/${id}`),

    create: (data: { name: string; description?: string; deanEmployeeId?: string }) =>
        apiClient.post<College>('/colleges', data),

    update: (id: number, data: { name?: string; description?: string }) =>
        apiClient.patch<College>(`/colleges/${id}`, data),

    assignDean: (id: number, employeeId: string | null) =>
        apiClient.patch<College>(`/colleges/${id}/dean`, { employeeId }),

    delete: (id: number) => apiClient.delete(`/colleges/${id}`),
};
