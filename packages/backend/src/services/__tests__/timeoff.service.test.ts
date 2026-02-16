
import { prismaMock } from '../../lib/prisma-mock';
import * as timeoffService from '../timeoff.service';
import { LeaveStatus } from '@prisma/client';

describe('TimeoffService', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('checkOverlappingRequests', () => {
        it('should allow request with no overlap', async () => {
            prismaMock.leaveRequest.findFirst.mockResolvedValue(null);
            prismaMock.sabbaticalRequest.findFirst.mockResolvedValue(null);

            await expect(
                timeoffService.checkOverlappingRequests(1, new Date('2024-06-01'), new Date('2024-06-05'))
            ).resolves.not.toThrow();
        });

        it('should throw error if overlapping leave exists', async () => {
            prismaMock.leaveRequest.findFirst.mockResolvedValue({
                id: 1,
                status: LeaveStatus.APPROVED
            } as any);

            await expect(
                timeoffService.checkOverlappingRequests(1, new Date('2024-06-01'), new Date('2024-06-05'))
            ).rejects.toThrow('Overlapping leave request');
        });

        it('should throw error if overlapping sabbatical exists', async () => {
            prismaMock.leaveRequest.findFirst.mockResolvedValue(null);
            prismaMock.sabbaticalRequest.findFirst.mockResolvedValue({
                id: 1,
                status: LeaveStatus.APPROVED
            } as any);

            await expect(
                timeoffService.checkOverlappingRequests(1, new Date('2024-06-01'), new Date('2024-06-05'))
            ).rejects.toThrow('Overlapping sabbatical request');
        });
    });

    describe('checkSabbaticalEligibility', () => {
        it('should allow sabbatical if eligible', async () => {
            prismaMock.employee.findUnique.mockResolvedValue({
                id: 1,
                serviceYears: 10, // Assuming 7+ years required
                sabbaticalHistory: []
            } as any);

            await expect(timeoffService.checkSabbaticalEligibility(1)).resolves.not.toThrow();
        });

        it('should throw error if not enough service years', async () => {
            prismaMock.employee.findUnique.mockResolvedValue({
                id: 1,
                serviceYears: 2, // Less than required
                sabbaticalHistory: []
            } as any);

            await expect(timeoffService.checkSabbaticalEligibility(1)).rejects.toThrow();
        });
    });
});
