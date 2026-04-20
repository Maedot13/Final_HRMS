import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { LeaveRequestModal } from '../features/leave/LeaveRequestModal';
import { leaveApi } from '../api/leave';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock API
vi.mock('../api/leave', () => ({
    leaveApi: {
        create: vi.fn(),
    }
}));

describe('Leave Application Form Requirements', () => {
    let queryClient: QueryClient;

    beforeEach(() => {
        queryClient = new QueryClient({
            defaultOptions: { queries: { retry: false } }
        });
        vi.clearAllMocks();
    });

    it('submits leave request API with correct form parameters', async () => {
        (leaveApi.create as any).mockResolvedValue({ data: { id: 1 } });
        const onCloseMock = vi.fn();

        render(
            <QueryClientProvider client={queryClient}>
                <LeaveRequestModal isOpen={true} onClose={onCloseMock} />
            </QueryClientProvider>
        );

        // Fill in dates using document because Modal might render in Portal
        const dateInputs = document.querySelectorAll('input[type="date"]');
        fireEvent.change(dateInputs[0]!, { target: { value: '2026-05-01' } });
        fireEvent.change(dateInputs[1]!, { target: { value: '2026-05-05' } });
        
        // Fill in reason
        fireEvent.change(document.querySelector('textarea[name="reason"]')!, { target: { value: 'Taking a nice vacation' } });
        
        // Change select
        fireEvent.change(document.querySelector('select[name="leaveType"]')!, { target: { value: 'ANNUAL' } });

        // Submit form
        fireEvent.click(screen.getByRole('button', { name: /Submit Request/i }));

        await waitFor(() => {
            expect(leaveApi.create).toHaveBeenCalledWith(expect.objectContaining({
                startDate: '2026-05-01',
                endDate: '2026-05-05',
                reason: 'Taking a nice vacation',
                leaveType: 'ANNUAL'
            }));
            // Assert modal was closed simulating a success/toast completion
            expect(onCloseMock).toHaveBeenCalled();
        });
    });
});
