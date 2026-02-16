import { prismaMock } from '../../lib/prisma-mock';
import { createLeaveRequest, approveRequest } from '../leave.service';
import { LeaveType, LeaveStatus } from '@prisma/client';
import * as timeoffService from '../timeoff.service';
import * as notificationService from '../notification.service';
// ... (imports)

// ...

// Mock transaction
prismaMock.$transaction.mockImplementation(async (callback: any) => {
    return callback(prismaMock);
});

// Mock dependencies
jest.mock('../timeoff.service');
jest.mock('../notification.service');

describe('Leave Service', () => {
    const mockEmployeeId = 1;
    const mockDate = new Date();

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('createLeaveRequest', () => {
        it('should create a leave request if balance is sufficient', async () => {
            const leaveData = {
                leaveType: LeaveType.ANNUAL,
                startDate: '2023-01-01',
                endDate: '2023-01-05',
                reason: 'Vacation'
            };

            // Mock Balance
            prismaMock.leaveBalance.upsert.mockResolvedValue({
                id: 1,
                employeeId: mockEmployeeId,
                year: 2023,
                annualBalance: 20,
                sickBalance: 15,
                maternityBalance: 0,
                paternityBalance: 0
            });

            // Mock Overlap Check
            (timeoffService.checkOverlappingRequests as jest.Mock).mockResolvedValue(undefined);

            // Mock Create
            prismaMock.leaveRequest.create.mockResolvedValue({
                id: 1,
                employeeId: mockEmployeeId,
                ...leaveData,
                startDate: new Date(leaveData.startDate),
                endDate: new Date(leaveData.endDate),
                days: 5,
                status: LeaveStatus.PENDING,
                createdAt: mockDate,
                updatedAt: mockDate,
                approverId: null,
                approverComment: null,
                attachmentUrl: null,
                resolvedAt: null,
                lastDecisionAt: null
            });

            const result = await createLeaveRequest(mockEmployeeId, leaveData);

            expect(result).toBeDefined();
            expect(result.days).toBe(5);
            expect(prismaMock.leaveBalance.upsert).toHaveBeenCalled();
            expect(timeoffService.checkOverlappingRequests).toHaveBeenCalled();
        });

        it('should throw error if balance is insufficient', async () => {
            const leaveData = {
                leaveType: LeaveType.ANNUAL,
                startDate: '2023-01-01',
                endDate: '2023-01-10', // 10 days
                reason: 'Long Vacation'
            };

            // Mock Balance (Only 5 days left)
            prismaMock.leaveBalance.upsert.mockResolvedValue({
                id: 1,
                employeeId: mockEmployeeId,
                year: 2023,
                annualBalance: 5,
                sickBalance: 15,
                maternityBalance: 0,
                paternityBalance: 0
            });

            await expect(createLeaveRequest(mockEmployeeId, leaveData))
                .rejects
                .toThrow('Insufficient leave balance for ANNUAL');
        });
    });

    describe('approveRequest', () => {
        it('should approve request and deduct balance', async () => {
            const requestId = 1;
            const approverId = 2;
            const request = {
                id: requestId,
                employeeId: mockEmployeeId,
                leaveType: LeaveType.ANNUAL,
                startDate: new Date('2023-01-01'),
                endDate: new Date('2023-01-05'),
                days: 5,
                status: LeaveStatus.PENDING
            };

            // Mock transaction
            prismaMock.$transaction.mockImplementation(async (callback: any) => {
                return callback(prismaMock);
            });

            prismaMock.leaveRequest.findUnique.mockResolvedValue(request as any);

            // Mock UpdateMany (Balance Deduction) - Simulate success (count: 1)
            prismaMock.leaveBalance.updateMany.mockResolvedValue({ count: 1 });

            // Mock Request Update
            prismaMock.leaveRequest.update.mockResolvedValue({
                ...request,
                status: LeaveStatus.APPROVED,
                employee: { userId: 123 }
            } as any);

            await approveRequest(requestId, approverId);

            expect(prismaMock.leaveBalance.updateMany).toHaveBeenCalledWith(expect.objectContaining({
                where: expect.objectContaining({
                    employeeId: mockEmployeeId,
                    year: 2023
                }),
                data: {
                    annualBalance: { decrement: 5 }
                }
            }));
            expect(notificationService.createNotification).toHaveBeenCalled();
        });

        it('should throw error if balance deduction fails (race condition)', async () => {
            const requestId = 1;
            const approverId = 2;
            const request = {
                id: requestId,
                employeeId: mockEmployeeId,
                leaveType: LeaveType.ANNUAL,
                startDate: new Date('2023-01-01'),
                endDate: new Date('2023-01-05'),
                days: 5,
                status: LeaveStatus.PENDING
            };

            prismaMock.$transaction.mockImplementation(async (callback: any) => {
                return callback(prismaMock);
            });

            prismaMock.leaveRequest.findUnique.mockResolvedValue(request as any);

            // Mock UpdateMany (Balance Deduction) - Simulate failure (count: 0)
            prismaMock.leaveBalance.updateMany.mockResolvedValue({ count: 0 });

            await expect(approveRequest(requestId, approverId))
                .rejects
                .toThrow('Insufficient leave balance');
        });
    });
});
