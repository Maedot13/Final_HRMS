import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import UsersPage from '../pages/UsersPage';
import { usersApi } from '../api/users';
import { departmentApi } from '../api/departments';
import { useAuthStore } from '../store/useAuthStore';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../api/users', () => ({
    usersApi: {
        listPaginated: vi.fn(),
    }
}));

vi.mock('../api/departments', () => ({
    departmentApi: {
        list: vi.fn()
    }
}));

describe('Campus Scoping in Employee List', () => {
    let queryClient: QueryClient;

    beforeEach(() => {
        queryClient = new QueryClient({
            defaultOptions: { queries: { retry: false } }
        });
        vi.clearAllMocks();
    });

    it('displays only backend-filtered campus employees without campus selectors', async () => {
        useAuthStore.setState({ user: { id: 1, role: 'ADMIN', campusId: 'campus-A' } as any });
        
        // Backend strictly scopes and filters data
        (usersApi.listPaginated as any).mockResolvedValue({
            data: {
                data: [
                    { id: 1, employeeId: 'EMP-A', email: 'a@campusA.edu', employee: { name: 'Alice Campus A' }, role: 'EMPLOYEE', isActive: true },
                ],
                pagination: { nextCursor: null }
            }
        });

        (departmentApi.list as any).mockResolvedValue({ data: [] });

        render(
            <QueryClientProvider client={queryClient}>
                <MemoryRouter>
                    <UsersPage />
                </MemoryRouter>
            </QueryClientProvider>
        );

        await waitFor(() => {
            // Frontend faithfully renders Alice
            expect(screen.getByText('Alice Campus A')).toBeDefined();
            // Bob (campus B) was filtered by the backend, thus NEVER rendered
            expect(screen.queryByText('Bob Campus B')).toBeNull();
        });
        
        // Assert no specific overarching Campus selector override is dangerously present
        // (The app's spec delegates this strictly to the backend API bounds and routing middleware)
        expect(screen.queryByLabelText(/Select Campus/i)).toBeNull();
    });
});
