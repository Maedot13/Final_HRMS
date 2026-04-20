import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ClearanceDetailModal } from '../features/clearance/ClearanceDetailModal';
import { clearanceApi } from '../api/clearance';
import { useAuthStore } from '../store/useAuthStore';
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../api/clearance', () => ({
    clearanceApi: {
        getById: vi.fn(),
        processCheck: vi.fn(),
    }
}));

describe('Clearance Task Approval', () => {
    let queryClient: QueryClient;

    beforeEach(() => {
        queryClient = new QueryClient({
            defaultOptions: { queries: { retry: false } }
        });
        vi.clearAllMocks();
    });

    it('processes check approvals and rejections', async () => {
        useAuthStore.setState({ user: { id: 1, role: 'HR_OFFICER' } as any });

        (clearanceApi.getById as any).mockResolvedValue({
            data: {
                id: 100,
                employee: { name: 'John Doe', employeeId: 'EMP-1' },
                reason: 'Resignation',
                status: 'PENDING',
                createdAt: new Date().toISOString(),
                checks: [
                    { unitId: 1, unit: { name: 'HR' }, status: 'PENDING' }
                ]
            }
        });

        // Mock window prompt for reject
        window.prompt = vi.fn().mockReturnValue('Library check failed missing items');

        render(
            <QueryClientProvider client={queryClient}>
                <ClearanceDetailModal isOpen={true} onClose={() => {}} requestId={100} />
            </QueryClientProvider>
        );

        // Wait for data to load
        await waitFor(() => {
            expect(screen.getByText('John Doe')).toBeDefined();
        });

        // The exact Approve / Reject buttons don't have text; they use react-icons (green-600 / red-600).
        // Since we can't easily query by icon without text, we can use container class querying or testing role by index
        // However, the button's classes differentiate them strongly (`text-green-600 hover:bg-green-50`)
        const buttons = screen.getAllByRole('button');
        const approveBtn = buttons[0]; // first in flex
        const rejectBtn = buttons[1]; // second in flex

        expect(approveBtn).toBeDefined();
        expect(rejectBtn).toBeDefined();

        // Approve it!
        (clearanceApi.processCheck as any).mockResolvedValue({ data: {} });
        fireEvent.click(approveBtn);

        await waitFor(() => {
            expect(clearanceApi.processCheck).toHaveBeenCalledWith(100, 1, { status: 'APPROVED' });
        });

        // Reject it!
        fireEvent.click(rejectBtn);

        await waitFor(() => {
            expect(clearanceApi.processCheck).toHaveBeenCalledWith(100, 1, { status: 'REJECTED', comment: 'Library check failed missing items' });
        });
    });
});
