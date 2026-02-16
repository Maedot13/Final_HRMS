import request from 'supertest';
import app from '../../app';
import { prismaMock } from '../../lib/prisma-mock';
import jwt from 'jsonwebtoken';
import { UserRole, LeaveType, LeaveStatus } from '@prisma/client';

describe('Leave Workflow Integration', () => {
    let authToken: string;
    const userId = 1;

    beforeAll(() => {
        // Generate a valid token for tests
        authToken = jwt.sign(
            { userId, role: UserRole.EMPLOYEE, employeeId: 'EMP001' },
            process.env.JWT_SECRET || 'secret',
            { expiresIn: '1h' }
        );
    });

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('POST /api/v1/leave', () => {
        it('should create a leave request', async () => {
            const leaveData = {
                leaveType: LeaveType.ANNUAL,
                startDate: '2023-06-01',
                endDate: '2023-06-05',
                reason: 'Summer break'
            };

            // Mock Balance Check
            prismaMock.leaveBalance.upsert.mockResolvedValue({
                id: 1,
                employeeId: userId,
                year: 2023,
                annualBalance: 10,
                sickBalance: 10,
                maternityBalance: 0,
                paternityBalance: 0
            } as any);

            // Mock Overlap Check
            prismaMock.leaveRequest.findFirst.mockResolvedValue(null);
            prismaMock.sabbaticalRequest.findFirst.mockResolvedValue(null);

            // Mock Create
            prismaMock.leaveRequest.create.mockResolvedValue({
                id: 1,
                employeeId: userId,
                ...leaveData,
                startDate: new Date(leaveData.startDate),
                endDate: new Date(leaveData.endDate),
                days: 5,
                status: LeaveStatus.PENDING,
                createdAt: new Date(),
                updatedAt: new Date()
            } as any);

            const res = await request(app)
                .post('/api/v1/leave')
                .set('Authorization', `Bearer ${authToken}`)
                .send(leaveData);

            expect(res.status).toBe(201);
            expect(res.body).toHaveProperty('id');
            expect(res.body.status).toBe('PENDING');
        });
    });
});
