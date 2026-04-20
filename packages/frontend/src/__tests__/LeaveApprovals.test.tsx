import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import LeaveManagementPage from '../pages/LeaveManagementPage';
import { useAuthStore } from '../store/useAuthStore';
import { leaveApi } from '../api/leave';
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../api/leave', () => ({
    leaveApi: {
        getPending: vi.fn(),
        list: vi.fn(),
        getBalances: vi.fn(),
    }
}));

describe('Leave Approval Dashboard Role Permissions', () => {
    let queryClient: QueryClient;

    beforeEach(() => {
        queryClient = new QueryClient({
            defaultOptions: { queries: { retry: false } }
        });
        vi.clearAllMocks();
        (leaveApi.getBalances as any).mockResolvedValue({ data: { annualBalance: 10 } });
    });

    it('renders Review button for an HR_OFFICER evaluating a pending request', async () => {
        useAuthStore.setState({ user: { id: 1, role: 'HR_OFFICER', employee: { id: 123 } } as any });
        
        (leaveApi.getPending as any).mockResolvedValue({
            data: [{
                id: 10,
                employee: { name: 'John Doe' },
                leaveType: 'ANNUAL',
                startDate: '2026-06-01',
                endDate: '2026-06-05',
                status: 'PENDING'
            }]
        });

        render(
            <QueryClientProvider client={queryClient}>
                <LeaveManagementPage />
            </QueryClientProvider>
        );

        await waitFor(() => {
            // Evaluator sees Review instead of directly Approve/Reject
            expect(screen.getByRole('button', { name: /Review/i })).toBeDefined();
        });
    });

    it('does NOT render Review button for standard EMPLOYEE role', async () => {
        useAuthStore.setState({ user: { id: 2, role: 'EMPLOYEE', employee: { id: 124 } } as any });
        
        // standard employee sees "My Requests" calling .list()
        (leaveApi.list as any).mockResolvedValue({
            data: [{
                id: 10,
                employee: { name: 'John Doe' },
                leaveType: 'ANNUAL',
                startDate: '2026-06-01',
                endDate: '2026-06-05',
                status: 'PENDING'
            }]
        });

        render(
            <QueryClientProvider client={queryClient}>
                <LeaveManagementPage />
            </QueryClientProvider>
        );

        await waitFor(() => {
            // Standard user does NOT see "Review", they only see "View"
            expect(screen.queryByRole('button', { name: /Review/i })).toBeNull();
            expect(screen.getByRole('button', { name: /View/i })).toBeDefined();
        });
    });
});
