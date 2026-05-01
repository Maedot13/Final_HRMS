
import { prismaMock } from '../../lib/prisma-mock';
import * as leaveService from '../leave.service';
import { LeaveType, LeaveStatus, LeaveStage } from '@prisma/client';

describe('LeaveService — Two-Stage Workflow', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('createLeaveRequest', () => {
        it('should create a leave request at DEPT_HEAD stage', async () => {
            prismaMock.employee.findUnique.mockResolvedValue({
                id: 1, campusId: 1, departmentId: 10,
                department: { headEmployeeId: 2 },
            } as any);

            prismaMock.leaveBalance.findUnique.mockResolvedValue({
                id: 1, employeeId: 1, year: 2026,
                annualBalance: 20, sickBalance: 180, personalBalance: 3,
            } as any);

            prismaMock.leaveRequest.findFirst.mockResolvedValue(null);

            prismaMock.leaveRequest.create.mockResolvedValue({
                id: 1,
                employeeId: 1,
                leaveType: LeaveType.ANNUAL,
                startDate: new Date('2026-07-01'),
                endDate: new Date('2026-07-05'),
                days: 5,
                reason: 'Vacation',
                status: LeaveStatus.PENDING,
                currentStage: LeaveStage.DEPT_HEAD,
                campusId: 1,
                employee: { name: 'John Doe', deptLegacy: 'Engineering', departmentId: 10 },
            } as any);

            const result = await leaveService.createLeaveRequest(1, {
                leaveType: LeaveType.ANNUAL,
                startDate: '2026-07-01',
                endDate: '2026-07-05',
                reason: 'Vacation',
            });

            expect(result.status).toBe(LeaveStatus.PENDING);
            expect(result.currentStage).toBe(LeaveStage.DEPT_HEAD);
            expect(result.days).toBe(5);
        });

        it('should throw if insufficient annual leave balance', async () => {
            prismaMock.employee.findUnique.mockResolvedValue({
                id: 1, campusId: 1, departmentId: 10,
                department: { headEmployeeId: 2 },
            } as any);

            prismaMock.leaveBalance.findUnique.mockResolvedValue({
                id: 1, employeeId: 1, year: 2026,
                annualBalance: 2, sickBalance: 180, personalBalance: 3,
            } as any);

            await expect(
                leaveService.createLeaveRequest(1, {
                    leaveType: LeaveType.ANNUAL,
                    startDate: '2026-07-01',
                    endDate: '2026-07-05', // 5 days requested, only 2 available
                    reason: 'Vacation',
                })
            ).rejects.toThrow('Insufficient');
        });

        it('should block overlapping leave requests', async () => {
            prismaMock.employee.findUnique.mockResolvedValue({
                id: 1, campusId: 1, departmentId: 10,
                department: { headEmployeeId: 2 },
            } as any);

            prismaMock.leaveBalance.findUnique.mockResolvedValue({
                id: 1, employeeId: 1, year: 2026,
                annualBalance: 20, sickBalance: 180, personalBalance: 3,
            } as any);

            prismaMock.leaveRequest.findFirst.mockResolvedValue({
                id: 99, employeeId: 1, status: LeaveStatus.PENDING,
            } as any);

            await expect(
                leaveService.createLeaveRequest(1, {
                    leaveType: LeaveType.ANNUAL,
                    startDate: '2026-07-01',
                    endDate: '2026-07-05',
                    reason: 'Vacation',
                })
            ).rejects.toThrow('overlapping');
        });
    });

    describe('deptHeadReview', () => {
        it('should reject and set status to REJECTED', async () => {
            prismaMock.$transaction.mockImplementation(async (cb: any) => cb(prismaMock));

            prismaMock.leaveRequest.findUnique.mockResolvedValue({
                id: 1, status: LeaveStatus.PENDING, currentStage: LeaveStage.DEPT_HEAD,
                leaveType: LeaveType.ANNUAL,
                employee: { name: 'Jane', departmentId: 10 },
            } as any);

            prismaMock.leaveRequest.update.mockResolvedValue({
                id: 1, status: LeaveStatus.REJECTED,
            } as any);
            prismaMock.leaveApproval.create.mockResolvedValue({} as any);

            const result = await leaveService.deptHeadReview(1, 2, 10, {
                decision: 'REJECTED',
                comment: 'Not enough notice',
            });

            expect(result.action).toBe('REJECTED');
        });

        it('should forward to HR_OFFICER stage on approval for standard leave', async () => {
            prismaMock.$transaction.mockImplementation(async (cb: any) => cb(prismaMock));

            prismaMock.leaveRequest.findUnique.mockResolvedValue({
                id: 1, status: LeaveStatus.PENDING, currentStage: LeaveStage.DEPT_HEAD,
                leaveType: LeaveType.ANNUAL,
                employee: { name: 'Jane', departmentId: 10 },
            } as any);

            prismaMock.leaveRequest.update.mockResolvedValue({
                id: 1, status: LeaveStatus.PENDING, currentStage: LeaveStage.HR_OFFICER,
            } as any);
            prismaMock.leaveApproval.create.mockResolvedValue({} as any);

            const result = await leaveService.deptHeadReview(1, 2, 10, {
                decision: 'APPROVED',
                comment: 'Looks good',
            });

            expect(result.action).toBe('FORWARDED');
            expect(result.nextStage).toBe(LeaveStage.HR_OFFICER);
        });

        it('should forward RESEARCH to DEAN stage', async () => {
            prismaMock.$transaction.mockImplementation(async (cb: any) => cb(prismaMock));

            prismaMock.leaveRequest.findUnique.mockResolvedValue({
                id: 2, status: LeaveStatus.PENDING, currentStage: LeaveStage.DEPT_HEAD,
                leaveType: LeaveType.RESEARCH,
                employee: { name: 'Prof. Smith', departmentId: 10 },
            } as any);

            prismaMock.leaveRequest.update.mockResolvedValue({
                id: 2, status: LeaveStatus.PENDING, currentStage: LeaveStage.DEAN,
            } as any);
            prismaMock.leaveApproval.create.mockResolvedValue({} as any);

            const result = await leaveService.deptHeadReview(2, 2, 10, {
                decision: 'APPROVED',
            });

            expect(result.nextStage).toBe(LeaveStage.DEAN);
        });
    });
});

