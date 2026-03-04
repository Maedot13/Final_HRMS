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

describe('Department Entity Integration (Phase 3)', () => {
    const campusAId = 1;
    const campusBId = 2;

    const campusAAdmin = {
        userId: 1,
        role: UserRole.ADMIN,
        scope: 'CAMPUS' as const,
        campusId: campusAId,
        employeeId: 'EMP-A-ADMIN',
    };

    const campusAHR = {
        userId: 10,
        role: UserRole.HR_OFFICER,
        scope: 'CAMPUS' as const,
        campusId: campusAId,
        employeeId: 'EMP-A-HR',
    };

    const validToken = 'valid-token';

    beforeEach(() => {
        jest.clearAllMocks();
        (tokenUtils.verifyToken as jest.Mock).mockReturnValue(campusAAdmin);
    });

    describe('POST /api/v1/departments', () => {
        it('successfully creates a department on own campus', async () => {
            prismaMock.department.findFirst.mockResolvedValue(null);
            prismaMock.$transaction.mockImplementation(async (fn: any) => fn(prismaMock));
            prismaMock.department.create.mockResolvedValue({ id: 1, name: 'Engineering', campusId: campusAId } as any);

            const res = await request(app)
                .post('/api/v1/departments')
                .set('Authorization', `Bearer ${validToken}`)
                .send({ name: 'Engineering' });

            expect(res.status).toBe(201);
            expect(res.body.name).toBe('Engineering');
            expect(prismaMock.department.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    data: expect.objectContaining({ campusId: campusAId })
                })
            );
        });

        it('denies creation for non-admin users', async () => {
            (tokenUtils.verifyToken as jest.Mock).mockReturnValue(campusAHR);

            const res = await request(app)
                .post('/api/v1/departments')
                .set('Authorization', `Bearer ${validToken}`)
                .send({ name: 'HR' });

            expect(res.status).toBe(403);
        });

        it('returns 409 for duplicate name on same campus', async () => {
            prismaMock.department.findFirst.mockResolvedValue({ id: 1, name: 'Engineering', campusId: campusAId } as any);

            const res = await request(app)
                .post('/api/v1/departments')
                .set('Authorization', `Bearer ${validToken}`)
                .send({ name: 'Engineering' });

            expect(res.status).toBe(409);
            expect(res.body.message).toMatch(/already exists/i);
        });
    });

    describe('GET /api/v1/departments', () => {
        it('returns only departments for current campus', async () => {
            (tokenUtils.verifyToken as jest.Mock).mockReturnValue(campusAHR);

            prismaMock.department.findMany.mockResolvedValue([
                { id: 1, name: 'Engineering', campusId: campusAId }
            ] as any);

            const res = await request(app)
                .get('/api/v1/departments')
                .set('Authorization', `Bearer ${validToken}`);

            expect(res.status).toBe(200);
            expect(prismaMock.department.findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: { campusId: campusAId }
                })
            );
        });
    });

    describe('DELETE /api/v1/departments/:id', () => {
        it('prevents deletion if department has employees', async () => {
            prismaMock.department.findFirst.mockResolvedValue({
                id: 1,
                name: 'Engineering',
                campusId: campusAId,
                _count: { employees: 5 }
            } as any);

            const res = await request(app)
                .delete('/api/v1/departments/1')
                .set('Authorization', `Bearer ${validToken}`);

            expect(res.status).toBe(400);
            expect(res.body.message).toMatch(/has 5 active employees/i);
        });

        it('allows deletion if empty', async () => {
            prismaMock.department.findFirst.mockResolvedValue({
                id: 1,
                name: 'Empty Dept',
                campusId: campusAId,
                _count: { employees: 0 }
            } as any);
            prismaMock.department.delete.mockResolvedValue({ id: 1 } as any);

            const res = await request(app)
                .delete('/api/v1/departments/1')
                .set('Authorization', `Bearer ${validToken}`);

            expect(res.status).toBe(200);
            expect(prismaMock.department.delete).toHaveBeenCalled();
        });
    });
});
