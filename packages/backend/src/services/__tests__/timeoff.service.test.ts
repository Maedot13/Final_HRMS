import { prismaMock } from '../../lib/prisma-mock';
import { checkSabbaticalEligibility } from '../timeoff.service';
import { LeaveStatus } from '@prisma/client';

describe('Timeoff Service - Sabbatical Eligibility', () => {
    const mockEmployeeId = 1;

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should throw error if service years < 7', async () => {
        prismaMock.employee.findUnique.mockResolvedValue({
            id: mockEmployeeId,
            serviceYears: 5 // Less than 7
        } as any);

        await expect(checkSabbaticalEligibility(mockEmployeeId))
            .rejects
            .toThrow('Sabbatical requires 7 years of service');
    });

    it('should throw error if cooldown period not met', async () => {
        prismaMock.employee.findUnique.mockResolvedValue({
            id: mockEmployeeId,
            serviceYears: 10
        } as any);

        // Mock last sabbatical ended 2 years ago
        const twoYearsAgo = new Date();
        twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);

        prismaMock.sabbaticalRequest.findFirst.mockResolvedValue({
            id: 1,
            endDate: twoYearsAgo,
            status: LeaveStatus.APPROVED
        } as any);

        await expect(checkSabbaticalEligibility(mockEmployeeId))
            .rejects
            .toThrow('Sabbatical cooldown period not met');
    });

    it('should pass if eligible', async () => {
        prismaMock.employee.findUnique.mockResolvedValue({
            id: mockEmployeeId,
            serviceYears: 10
        } as any);

        // No previous sabbatical
        prismaMock.sabbaticalRequest.findFirst.mockResolvedValue(null);

        await expect(checkSabbaticalEligibility(mockEmployeeId))
            .resolves
            .not.toThrow();
    });
});
