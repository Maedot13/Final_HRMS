import { prismaMock } from '../../lib/prisma-mock';
import { createSabbaticalRequest } from '../sabbatical.service';
import * as timeoffService from '../timeoff.service';
import { LeaveStatus } from '@prisma/client';

// Mock dependencies
jest.mock('../timeoff.service');

describe('Sabbatical Service', () => {
    const mockEmployeeId = 1;

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('createSabbaticalRequest', () => {
        it('should throw error if duration exceeds 12 months', async () => {
            const data = {
                purpose: 'Study',
                startDate: '2023-01-01',
                endDate: '2024-02-01', // 13 months
                plan: 'Study Plan'
            };

            await expect(createSabbaticalRequest(mockEmployeeId, data))
                .rejects
                .toThrow('Sabbatical duration cannot exceed 12 months');
        });

        it('should check eligibility rules', async () => {
            const data = {
                purpose: 'Study',
                startDate: '2023-01-01',
                endDate: '2023-12-01', // 11 months
                plan: 'Study Plan'
            };

            // Mock Eligibility Check
            (timeoffService.checkSabbaticalEligibility as jest.Mock).mockResolvedValue(undefined);
            (timeoffService.checkOverlappingRequests as jest.Mock).mockResolvedValue(undefined);

            prismaMock.sabbaticalRequest.create.mockResolvedValue({
                id: 1,
                employeeId: mockEmployeeId,
                ...data,
                startDate: new Date(data.startDate),
                endDate: new Date(data.endDate),
                durationMonths: 11,
                status: LeaveStatus.PENDING,
                createdAt: new Date(),
                updatedAt: new Date(),
                approverId: null,
                approverComment: null,
                resolvedAt: null,
                lastDecisionAt: null,
                planDocumentUrl: null
            });

            await createSabbaticalRequest(mockEmployeeId, data);

            expect(timeoffService.checkSabbaticalEligibility).toHaveBeenCalledWith(mockEmployeeId);
        });
    });
});
