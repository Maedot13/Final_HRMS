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

describe('Campus Activation Readiness Gate (Phase 5)', () => {
    const campusId = 1;
    const universityAdmin = {
        userId: 1,
        role: UserRole.ADMIN,
        scope: 'UNIVERSITY' as const,
        campusId: null,
        employeeId: 'EMP-UNIV-ADMIN',
    };

    const validToken = 'valid-token';

    beforeEach(() => {
        jest.clearAllMocks();
        (tokenUtils.verifyToken as jest.Mock).mockReturnValue(universityAdmin);
    });

    describe('GET /api/v1/campuses/:id/readiness', () => {
        it('returns not ready when missing roles and no departments', async () => {
            // No users at all → missing ADMIN, HR_OFFICER, FINANCE_OFFICER
            (prismaMock.user.findMany as jest.Mock).mockResolvedValue([]);
            (prismaMock.department.findMany as jest.Mock).mockResolvedValue([]);

            const res = await request(app)
                .get(`/api/v1/campuses/${campusId}/readiness`)
                .set('Authorization', `Bearer ${validToken}`);

            expect(res.status).toBe(200);
            expect(res.body.isReady).toBe(false);
            expect(res.body.missingCampusRoles).toEqual(
                expect.arrayContaining(['ADMIN', 'HR_OFFICER', 'FINANCE_OFFICER'])
            );
            expect(res.body.deptsWithoutHead).toEqual([]);
        });

        it('returns not ready when roles present but department has no head', async () => {
            (prismaMock.user.findMany as jest.Mock).mockResolvedValue([
                { role: 'ADMIN' },
                { role: 'HR_OFFICER' },
                { role: 'FINANCE_OFFICER' },
            ]);
            (prismaMock.department.findMany as jest.Mock).mockResolvedValue([
                { id: 1, name: 'Engineering', headEmployeeId: null, _count: { employees: 5 }, head: null },
            ]);

            const res = await request(app)
                .get(`/api/v1/campuses/${campusId}/readiness`)
                .set('Authorization', `Bearer ${validToken}`);

            expect(res.status).toBe(200);
            expect(res.body.isReady).toBe(false);
            expect(res.body.missingCampusRoles).toEqual([]);
            expect(res.body.deptsWithoutHead).toEqual(['Engineering']);
        });

        it('returns ready when all roles present and all depts have heads', async () => {
            (prismaMock.user.findMany as jest.Mock).mockResolvedValue([
                { role: 'ADMIN' },
                { role: 'HR_OFFICER' },
                { role: 'FINANCE_OFFICER' },
            ]);
            (prismaMock.department.findMany as jest.Mock).mockResolvedValue([
                { id: 1, name: 'Engineering', headEmployeeId: 10, _count: { employees: 5 }, head: { id: 10 } },
            ]);

            const res = await request(app)
                .get(`/api/v1/campuses/${campusId}/readiness`)
                .set('Authorization', `Bearer ${validToken}`);

            expect(res.status).toBe(200);
            expect(res.body.isReady).toBe(true);
            expect(res.body.missingCampusRoles).toEqual([]);
            expect(res.body.deptsWithoutHead).toEqual([]);
        });
    });

    describe('PATCH /api/v1/campuses/:id — activation gate', () => {
        it('blocks activation when campus is missing roles', async () => {
            (prismaMock.campus.findUnique as jest.Mock).mockResolvedValue({
                id: campusId, code: 'TST', name: 'Test', isActive: false,
            });
            // Only ADMIN present → missing HR_OFFICER, FINANCE_OFFICER
            (prismaMock.user.findMany as jest.Mock).mockResolvedValue([{ role: 'ADMIN' }]);
            (prismaMock.department.findMany as jest.Mock).mockResolvedValue([]);

            const res = await request(app)
                .patch(`/api/v1/campuses/${campusId}`)
                .set('Authorization', `Bearer ${validToken}`)
                .send({ isActive: true });

            expect(res.status).toBeGreaterThanOrEqual(400);
            expect(res.body.message).toMatch(/cannot be activated/i);
            expect(res.body.message).toMatch(/Missing roles/i);
        });

        it('blocks activation when department has no head', async () => {
            (prismaMock.campus.findUnique as jest.Mock).mockResolvedValue({
                id: campusId, code: 'TST', name: 'Test', isActive: false,
            });
            // All roles present
            (prismaMock.user.findMany as jest.Mock).mockResolvedValue([
                { role: 'ADMIN' }, { role: 'HR_OFFICER' }, { role: 'FINANCE_OFFICER' },
            ]);
            // But department has no head
            (prismaMock.department.findMany as jest.Mock).mockResolvedValue([
                { id: 1, name: 'Engineering', headEmployeeId: null, _count: { employees: 3 }, head: null },
            ]);

            const res = await request(app)
                .patch(`/api/v1/campuses/${campusId}`)
                .set('Authorization', `Bearer ${validToken}`)
                .send({ isActive: true });

            expect(res.status).toBeGreaterThanOrEqual(400);
            expect(res.body.message).toMatch(/cannot be activated/i);
            expect(res.body.message).toMatch(/Departments without head/i);
        });

        it('allows activation when all requirements are met', async () => {
            (prismaMock.campus.findUnique as jest.Mock).mockResolvedValue({
                id: campusId, code: 'TST', name: 'Test', isActive: false,
            });
            (prismaMock.user.findMany as jest.Mock).mockResolvedValue([
                { role: 'ADMIN' }, { role: 'HR_OFFICER' }, { role: 'FINANCE_OFFICER' },
            ]);
            (prismaMock.department.findMany as jest.Mock).mockResolvedValue([
                { id: 1, name: 'Engineering', headEmployeeId: 10, _count: { employees: 5 }, head: { id: 10 } },
            ]);
            (prismaMock.campus.update as jest.Mock).mockResolvedValue({
                id: campusId, code: 'TST', name: 'Test', isActive: true,
            });

            const res = await request(app)
                .patch(`/api/v1/campuses/${campusId}`)
                .set('Authorization', `Bearer ${validToken}`)
                .send({ isActive: true });

            expect(res.status).toBe(200);
            expect(res.body.isActive).toBe(true);
        });
    });
});
