import apiClient from './client';
import type { UserRole } from '../types';

export interface PrivilegedUser {
    id: number;
    email: string;
    role: UserRole;
    employee?: { name: string; employeeId: string };
    campus?: { name: string };
}

export const privilegesApi = {
    list: () => apiClient.get<PrivilegedUser[]>('/privileges/users'),
    
    assign: (data: { userId: number; role: 'HEAD_HR' | 'SUPER_ADMIN' }) => 
        apiClient.post<{ message: string; user: { id: number; role: string } }>('/privileges/assign', data),
        
    revoke: (userId: number) => 
        apiClient.delete<{ message: string; user: { id: number; role: string } }>(`/privileges/${userId}`),
};
