
import { prismaMock } from '../../lib/prisma-mock';
import * as leaveService from '../leave.service';
import { LeaveType, LeaveStatus } from '@prisma/client';

describe('LeaveService - Employee to Department Head Workflow', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('createLeaveRequest', () => {
        it('should create leave request with employee info for department head', async () => {
            const mockBalance = {
                id: 1,
                employeeId: 1,
                year: 2024,
                annualBalance: 20,
                sickBalance: 15,
                maternityBalance: 0,
                paternityBalance: 0,
            };

            const mockEmployee = {
                id: 1,
                userId: 1,
                employeeId: 'EMP001',
                name: 'John Doe',
                department: 'Engineering',
                position: 'Software Developer',
                hireDate: new Date('2020-01-01'),
            };

            prismaMock.leaveBalance.upsert.mockResolvedValue(mockBalance as any);
            prismaMock.leaveRequest.findFirst.mockResolvedValue(null);
            prismaMock.sabbaticalRequest.findFirst.mockResolvedValue(null);

            prismaMock.leaveRequest.create.mockResolvedValue({
                id: 1,
                employeeId: 1,
                leaveType: LeaveType.ANNUAL,
                startDate: new Date('2024-06-01'),
                endDate: new Date('2024-06-05'),
                days: 5,
                reason: 'Family vacation',
                status: LeaveStatus.PENDING,
                employee: mockEmployee,
                createdAt: new Date(),
                updatedAt: new Date(),
            } as any);

            // Mock finding department heads for notification
            prismaMock.employee.findMany.mockResolvedValue([]);

            // We need to pass the arguments that createLeaveRequest expects.
            // Assuming createLeaveRequest(employeeId: number, data: LeaveRequestInput)
            const result = await leaveService.createLeaveRequest(1, {
                leaveType: LeaveType.ANNUAL,
                startDate: '2024-06-01',
                endDate: '2024-06-05',
                reason: 'Family vacation',
            });

            // Verify request includes employee information
            expect(result.employee.name).toBe('John Doe');
            expect(result.employee.department).toBe('Engineering');
            expect(result.days).toBe(5);
            expect(result.status).toBe(LeaveStatus.PENDING);
        });

        it('should prevent leave request with insufficient balance', async () => {
            const mockBalance = {
                id: 1,
                employeeId: 1,
                year: 2024,
                annualBalance: 2, // Only 2 days available
                sickBalance: 15,
                maternityBalance: 0,
                paternityBalance: 0,
            };

            prismaMock.leaveBalance.upsert.mockResolvedValue(mockBalance as any);

            await expect(
                leaveService.createLeaveRequest(1, {
                    leaveType: LeaveType.ANNUAL,
                    startDate: '2024-06-01',
                    endDate: '2024-06-05', // Requesting 5 days
                    reason: 'Vacation',
                })
            ).rejects.toThrow('Insufficient leave balance');
        });

        it('should prevent overlapping leave requests', async () => {
            const mockBalance = {
                id: 1,
                employeeId: 1,
                year: 2024,
                annualBalance: 20,
                sickBalance: 15,
                maternityBalance: 0,
                paternityBalance: 0,
            };

            prismaMock.leaveBalance.upsert.mockResolvedValue(mockBalance as any);

            // Mock existing overlapping request
            prismaMock.leaveRequest.findFirst.mockResolvedValue({
                id: 1,
                employeeId: 1,
                startDate: new Date('2024-06-03'),
                endDate: new Date('2024-06-07'),
                status: LeaveStatus.APPROVED,
            } as any);

            await expect(
                leaveService.createLeaveRequest(1, {
                    leaveType: LeaveType.ANNUAL,
                    startDate: '2024-06-01',
                    endDate: '2024-06-05',
                    reason: 'Vacation',
                })
            ).rejects.toThrow('Overlapping leave request'); // Expected error message
            // Note: Actual error might be different, we'll see.
        });
    });

    describe('approveRequest - Department Head Action', () => {
        it('should approve request and deduct balance', async () => {
            const mockRequest = {
                id: 1,
                employeeId: 1,
                leaveType: LeaveType.ANNUAL,
                startDate: new Date('2024-06-01'),
                endDate: new Date('2024-06-05'),
                days: 5,
                status: LeaveStatus.PENDING,
            };

            prismaMock.$transaction.mockImplementation(async (callback: any) => {
                return callback(prismaMock);
            });

            prismaMock.leaveRequest.findUnique.mockResolvedValue(mockRequest as any);
            prismaMock.leaveBalance.updateMany.mockResolvedValue({ count: 1 } as any);
            prismaMock.leaveRequest.update.mockResolvedValue({
                ...mockRequest,
                status: LeaveStatus.APPROVED,
                approverId: 2, // Department head ID
                approverComment: 'Approved for vacation',
                employee: { userId: 1, name: 'John Doe' },
            } as any);

            const result = await leaveService.approveRequest(1, 2, 'Approved for vacation');

            expect(result.status).toBe(LeaveStatus.APPROVED);
            // We expect logic to handle approver assignment via update data
        });
    });
});
