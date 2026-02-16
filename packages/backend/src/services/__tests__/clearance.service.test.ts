import { prismaMock } from '../../lib/prisma-mock';
import { approveCheck, rejectCheck } from '../clearance.service';
import { ClearanceStatus } from '@prisma/client';
import * as notificationService from '../notification.service';

// Mock dependencies
jest.mock('../notification.service');

describe('Clearance Service', () => {
    const mockClearanceId = 1;
    const mockUnitId = 1;
    const mockApproverId = 2;

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('approveCheck', () => {
        it('should approve check and complete clearance if all approved', async () => {
            // Mock Transaction
            prismaMock.$transaction.mockImplementation(async (callback: any) => {
                return callback(prismaMock);
            });

            // Mock Check Find
            prismaMock.clearanceCheck.findUnique.mockResolvedValue({
                id: 1,
                clearanceId: mockClearanceId,
                unitId: mockUnitId,
                status: ClearanceStatus.PENDING
            } as any);

            // Mock Check Update
            prismaMock.clearanceCheck.update.mockResolvedValue({} as any);

            // Mock Count Pending (0 means all done)
            prismaMock.clearanceCheck.count.mockResolvedValue(0);

            // Mock Clearance Update
            prismaMock.clearanceRequest.update.mockResolvedValue({
                id: mockClearanceId,
                employeeId: 100,
                status: ClearanceStatus.APPROVED
            } as any);

            // Mock Notification (Clearance Completed)
            prismaMock.clearanceRequest.findUnique.mockResolvedValue({
                id: mockClearanceId,
                employeeId: 100,
                status: ClearanceStatus.APPROVED,
                employee: { userId: 999 }
            } as any);

            prismaMock.payrollTransfer.create.mockResolvedValue({} as any);
            prismaMock.notification.create.mockResolvedValue({} as any);

            const result = await approveCheck(mockClearanceId, mockUnitId, mockApproverId);

            expect(result.status).toBe('COMPLETED');
            expect(prismaMock.clearanceRequest.update).toHaveBeenCalledWith(expect.objectContaining({
                data: { status: ClearanceStatus.APPROVED }
            }));
        });
    });

    describe('rejectCheck', () => {
        it('should reject check', async () => {
            prismaMock.$transaction.mockImplementation(async (callback: any) => {
                return callback(prismaMock);
            });

            prismaMock.clearanceCheck.findUnique.mockResolvedValue({
                id: 1,
                clearanceId: mockClearanceId,
                unitId: mockUnitId,
                status: ClearanceStatus.PENDING
            } as any);

            prismaMock.clearanceCheck.update.mockResolvedValue({} as any);

            // Mock notification setup
            prismaMock.clearanceRequest.findUnique.mockResolvedValue({
                id: mockClearanceId,
                employee: { userId: 999 }
            } as any);
            prismaMock.clearanceUnit.findUnique.mockResolvedValue({ name: 'IT' } as any);
            prismaMock.notification.create.mockResolvedValue({} as any);

            const result = await rejectCheck(mockClearanceId, mockUnitId, mockApproverId, 'Reason');

            expect(result.status).toBe('REJECTED');
            expect(prismaMock.clearanceCheck.update).toHaveBeenCalledWith(expect.objectContaining({
                data: expect.objectContaining({ status: ClearanceStatus.REJECTED })
            }));
        });
    });
});
