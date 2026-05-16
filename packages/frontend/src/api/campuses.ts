import apiClient from './client';
import type { Campus, CampusReadiness } from '../types';

/** Safely unwrap the backend { success, data } envelope into an array. */
function extractArray<T>(res: { data: unknown }): T[] {
    const raw = res.data as any;
    if (Array.isArray(raw)) return raw as T[];
    if (raw && Array.isArray(raw.data)) return raw.data as T[];
    return [];
}

function extractSingle<T>(res: { data: unknown }): T | null {
    const raw = res.data as any;
    if (raw && raw.data !== undefined) return raw.data as T ?? null;
    return (raw as T) ?? null;
}

export const campusApi = {
    /**
     * List ALL campuses — requires UNIVERSITY admin (SUPER_ADMIN or ADMIN+UNIVERSITY scope).
     * Returns a clean array regardless of envelope shape.
     */
    list: async (activeOnly?: boolean): Promise<{ data: Campus[] }> => {
        const res = await apiClient.get<Campus[]>('/campuses', {
            params: activeOnly ? { active: 'true' } : undefined,
        });
        return { data: extractArray<Campus>(res) };
    },

    /**
     * Get the calling user's OWN campus — accessible to any authenticated user
     * (HR Officer, Campus Admin, etc.). Returns null for UNIVERSITY-scoped users.
     */
    getMine: async (): Promise<Campus | null> => {
        const res = await apiClient.get<Campus>('/campuses/mine');
        return extractSingle<Campus>(res);
    },

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
    }) =>
        apiClient.post<{ campus: Campus; adminEmployeeId: string; tempPassword?: string; warning?: string }>(
            '/campuses',
            data
        ),

    update: (
        id: number,
        data: Partial<{
            name: string;
            description: string | null;
            isActive: boolean;
            timezone: string;
            employeeIdPrefix: string;
            employeeNumericLength: number;
        }>
    ) => apiClient.patch<Campus>(`/campuses/${id}`, data),

    getUsers: (id: number) =>
        apiClient.get<{
            campus: { id: number; code: string; name: string };
            users: Array<{
                id: number;
                employeeId: string;
                email: string;
                role: string;
                employee?: { name: string; deptLegacy?: string };
            }>;
        }>(`/campuses/${id}/users`),
};
