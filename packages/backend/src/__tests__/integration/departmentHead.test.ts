import request from 'supertest';
import app from '../../app';
import { prismaMock } from '../../lib/prisma-mock';
import { UserRole } from '@prisma/client';
import * as tokenUtils from '../../utils/token';

jest.mock('../../utils/token', () => ({
    ...jest.requireActual('../../utils/token'),
    verifyToken: jest.fn(),
}));

jest.mock('../../utils/tokenBlacklist', () => ({
    isTokenBlacklisted: jest.fn().mockResolvedValue(false),
}));

jest.mock('../../lib/redis', () => ({
    redis: {
        get: jest.fn().mockResolvedValue(null),
        setex: jest.fn().mockResolvedValue('OK'),
        setEx: jest.fn().mockResolvedValue('OK'),
        set: jest.fn().mockResolvedValue('OK'),
        connect: jest.fn().mockResolvedValue(undefined),
        on: jest.fn(),
    },
}));

describe('Department Head Enforcement Integration (Phase 4)', () => {
    const campusId = 1;
    const campusAdmin = {
        userId: 1,
        role: UserRole.ADMIN,
        scope: 'CAMPUS' as const,
        campusId: campusId,
        employeeId: 'EMP-ADMIN',
    };

    const validToken = 'valid-token';

    beforeEach(() => {
        jest.clearAllMocks();
        (tokenUtils.verifyToken as jest.Mock).mockReturnValue(campusAdmin);
    });

    describe('PATCH /api/v1/departments/:id/head', () => {
        it('assigns a head and promotes role', async () => {
            const mockDept = { id: 10, name: 'Engineering', campusId, headEmployeeId: null, head: null };
            const mockEmployee = { id: 50, employeeId: 'EMP-NEW-HEAD', campusId, userId: 100, user: { role: 'EMPLOYEE' } };

            (prismaMock.department.findFirst as jest.Mock).mockResolvedValue(mockDept);
            (prismaMock.employee.findUnique as jest.Mock).mockResolvedValue(mockEmployee);
            (prismaMock.department.findFirst as jest.Mock)
                .mockResolvedValueOnce(mockDept) // for dept check
                .mockResolvedValueOnce(null);  // for alreadyHeadOf check

            (prismaMock.$transaction as jest.Mock).mockImplementation((fn: any) => fn(prismaMock));
            (prismaMock.user.update as jest.Mock).mockResolvedValue({ id: 100, role: 'DEPARTMENT_HEAD' });
            (prismaMock.department.update as jest.Mock).mockResolvedValue({ ...mockDept, headEmployeeId: 50 });

            const res = await request(app)
                .patch('/api/v1/departments/10/head')
                .set('Authorization', `Bearer ${validToken}`)
                .send({ employeeId: 'EMP-NEW-HEAD' });

            expect(res.status).toBe(200);
            expect(prismaMock.user.update).toHaveBeenCalledWith(
                expect.objectContaining({ data: { role: 'DEPARTMENT_HEAD' } })
            );
        });

        it('demotes old head if they no longer head any department', async () => {
            const oldHeadEmployee = { id: 40, userId: 99, user: { role: 'DEPARTMENT_HEAD' } };
            const mockDept = { id: 10, name: 'Engineering', campusId, headEmployeeId: 40, head: oldHeadEmployee };
            const newHeadEmployee = { id: 50, employeeId: 'EMP-NEW-HEAD', campusId, userId: 100, user: { role: 'EMPLOYEE' } };

            (prismaMock.department.findFirst as jest.Mock).mockResolvedValue(mockDept);
            (prismaMock.employee.findUnique as jest.Mock).mockResolvedValue(newHeadEmployee);
            (prismaMock.department.findFirst as jest.Mock)
                .mockResolvedValueOnce(mockDept)
                .mockResolvedValueOnce(null);

            (prismaMock.$transaction as jest.Mock).mockImplementation((fn: any) => fn(prismaMock));
            (prismaMock.department.count as jest.Mock).mockResolvedValue(0);

            const res = await request(app)
                .patch('/api/v1/departments/10/head')
                .set('Authorization', `Bearer ${validToken}`)
                .send({ employeeId: 'EMP-NEW-HEAD' });

            expect(res.status).toBe(200);
            expect(prismaMock.user.update).toHaveBeenCalledWith(
                expect.objectContaining({ where: { id: 99 }, data: { role: 'EMPLOYEE' } })
            );
        });
    });

    describe('Employee Registration Warnings', () => {
        it('includes warning when registering to head-less department', async () => {
            (prismaMock.employee.findUnique as jest.Mock).mockResolvedValue(null);
            (prismaMock.user.findUnique as jest.Mock).mockResolvedValue(null);
            (prismaMock.campus.findUnique as jest.Mock).mockResolvedValue({ id: campusId });
            (prismaMock.department.findUnique as jest.Mock).mockResolvedValue({ id: 10, name: 'No-Head-Dept', headEmployeeId: null });

            (prismaMock.$transaction as jest.Mock).mockImplementation((async (fn: any) => {
                return {
                    newUser: { id: 2, role: 'EMPLOYEE', campusId, employeeId: 'EMP-2', email: 'test@test.com', mustChangePassword: true, createdAt: new Date(), updatedAt: new Date() },
                    newEmployee: { id: 2, name: 'Test User', employeeId: 'EMP-2', hireDate: new Date() }
                };
            }) as any);

            const res = await request(app)
                .post('/api/v1/auth/register')
                .set('Authorization', `Bearer ${validToken}`)
                .send({
                    email: 'test@test.com',
                    name: 'Test User',
                    employeeId: 'EMP-2',
                    departmentId: 10
                });

            if (res.status !== 201) {
                console.log('Registration Error Response:', JSON.stringify(res.body, null, 2));
            }
            expect(res.status).toBe(201);
            expect(res.body.warning).toMatch(/no Department Head assigned/i);
        });
    });
});
