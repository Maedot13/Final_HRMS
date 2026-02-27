
import { prismaMock } from '../../lib/prisma-mock';
import * as sabbaticalService from '../sabbatical.service';
import * as timeoffService from '../timeoff.service';
import { LeaveStatus } from '@prisma/client';

// Mock timeoff service partly to isolate sabbatical logic or just rely on prisma mocks
// Since sabbatical service uses timeoff service internally, we can either spy on it or let it run
// if timeoff service logic is purely prisma-based.
// Let's spy on checkSabbaticalEligibility to control the outcome easily.

jest.mock('../timeoff.service', () => ({
    checkSabbaticalEligibility: jest.fn(),
    checkOverlappingRequests: jest.fn(),
}));

describe('SabbaticalService', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('createSabbaticalRequest', () => {
        it('should create sabbatical request if eligible', async () => {
            const mockData = {
                employeeId: 1,
                purpose: 'Research',
                startDate: '2024-09-01',
                endDate: '2024-12-01',
                plan: 'Write a book',
            };

            // Mock eligibility check to pass
            (timeoffService.checkSabbaticalEligibility as jest.Mock).mockResolvedValue(undefined);
            (timeoffService.checkOverlappingRequests as jest.Mock).mockResolvedValue(undefined);

            prismaMock.sabbaticalRequest.create.mockResolvedValue({
                id: 1,
                ...mockData,
                startDate: new Date(mockData.startDate),
                endDate: new Date(mockData.endDate),
                durationMonths: 3,
                planDocumentUrl: null,
                approverId: null,
                status: LeaveStatus.PENDING,
                employee: { name: 'John', userId: 1 },
                createdAt: new Date(),
                updatedAt: new Date(),
            } as any);

            // Mock finding department heads for notification
            prismaMock.employee.findMany.mockResolvedValue([]);

            const result = await sabbaticalService.createSabbaticalRequest(1, mockData);

            expect(result.status).toBe(LeaveStatus.PENDING);
            expect(timeoffService.checkSabbaticalEligibility).toHaveBeenCalledWith(1);
        });

        it('should fail if eligibility check fails', async () => {
            (timeoffService.checkSabbaticalEligibility as jest.Mock).mockRejectedValue(new Error('Not eligible'));

            await expect(
                sabbaticalService.createSabbaticalRequest(1, {
                    purpose: 'Research',
                    startDate: '2024-09-01',
                    endDate: '2024-12-01',
                    plan: 'Write a book'
                })
            ).rejects.toThrow('Not eligible');
        });
    });

    describe('approveSabbatical', () => {
        it('should approve sabbatical and send notification', async () => {
            const mockRequest = {
                id: 1,
                employeeId: 1,
                status: LeaveStatus.PENDING,
                employee: { userId: 1, name: 'John' },
            };

            prismaMock.sabbaticalRequest.findUnique.mockResolvedValue(mockRequest as any);
            prismaMock.sabbaticalRequest.update.mockResolvedValue({
                ...mockRequest,
                status: LeaveStatus.APPROVED
            } as any);

            // Mock notification creation if needed, depending on implementation
            prismaMock.notification.create.mockResolvedValue({} as any);

            const result = await sabbaticalService.approveSabbatical(1, 2, null, 'Approved');

            expect(result.status).toBe(LeaveStatus.APPROVED);
        });
    });
});
