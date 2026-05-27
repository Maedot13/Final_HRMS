import apiClient from './client';
import type { UserRole, SpecialPrivilege } from '../types';

export interface PrivilegedUser {
    id: number;
    email: string;
    role: UserRole;
    isHeadHR: boolean;
    specialPrivileges: SpecialPrivilege[];
    employee?: { name: string; employeeId: string };
    campus?: { name: string };
}

export const privilegesApi = {
    list: () => apiClient.get<PrivilegedUser[]>('/privileges/users'),
    
    assign: (data: { userId: number; role?: 'SUPER_ADMIN'; isHeadHR?: boolean; specialPrivileges?: SpecialPrivilege[] }) => 
        apiClient.post<{ message: string; user: PrivilegedUser }>('/privileges/assign', data),
        
    revoke: (userId: number) => 
        apiClient.delete<{ message: string; user: { id: number; role: string } }>(`/privileges/${userId}`),

    assignAVP: (data: { employeeId: string }) =>
        apiClient.post<{ message: string; user: PrivilegedUser }>('/privileges/avp/assign', data),

    revokeAVP: (employeeId: string) =>
        apiClient.delete<{ message: string; user: PrivilegedUser }>(`/privileges/avp/${employeeId}`),
};
