import request from 'supertest';
import app from '../../app';
import { prismaMock } from '../../lib/prisma-mock';
import { UserRole } from '@prisma/client';
import * as tokenUtils from '../../utils/token';

// Mock verifyToken to simulate an authenticated admin
jest.mock('../../utils/token', () => ({
    ...jest.requireActual('../../utils/token'),
    verifyToken: jest.fn()
}));

describe('User Management Integration', () => {
    const adminToken = 'valid-admin-token';
    const adminPayload = { userId: 1, employeeId: 'EMP001', role: UserRole.ADMIN, scope: 'UNIVERSITY', campusId: 1 };

    beforeEach(() => {
        jest.clearAllMocks();
        (tokenUtils.verifyToken as jest.Mock).mockReturnValue(adminPayload);
    });

    describe('PATCH /api/v1/users/:id/role', () => {
        it('should prevent an admin from changing their own role', async () => {
            const res = await request(app)
                .patch('/api/v1/users/1/role')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ role: UserRole.EMPLOYEE });

            expect(res.status).toBe(403);
            expect(res.body.message).toContain('You cannot change your own role');
        });

        it('should prevent demoting the last active admin', async () => {
            // Mock target user is an admin
            prismaMock.user.findUnique.mockResolvedValue({
                id: 2,
                role: UserRole.ADMIN,
                isActive: true
            } as any);

            // Mock only one admin exists
            prismaMock.user.count.mockResolvedValue(1);

            const res = await request(app)
                .patch('/api/v1/users/2/role')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ role: UserRole.EMPLOYEE });

            expect(res.status).toBe(403);
            expect(res.body.message).toContain('Cannot demote the last active admin');
        });

        it('should allow changing role of another user if multiple admins exist', async () => {
            prismaMock.user.findUnique.mockResolvedValue({
                id: 2,
                role: UserRole.EMPLOYEE,
                isActive: true
            } as any);

            prismaMock.user.update.mockResolvedValue({
                id: 2,
                role: UserRole.ADMIN
            } as any);

            const res = await request(app)
                .patch('/api/v1/users/2/role')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ role: UserRole.ADMIN });

            expect(res.status).toBe(200);
            expect(prismaMock.user.update).toHaveBeenCalled();
        });
    });

    describe('PATCH /api/v1/users/:id/status', () => {
        it('should prevent an admin from deactivating their own account', async () => {
            const res = await request(app)
                .patch('/api/v1/users/1/status')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ isActive: false });

            expect(res.status).toBe(403);
            expect(res.body.message).toContain('You cannot deactivate your own account');
        });

        it('should prevent deactivating the last active admin', async () => {
            prismaMock.user.findUnique.mockResolvedValue({
                id: 2,
                role: UserRole.ADMIN,
                isActive: true
            } as any);

            prismaMock.user.count.mockResolvedValue(1);

            const res = await request(app)
                .patch('/api/v1/users/2/status')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ isActive: false });


            expect(res.status).toBe(403);
            expect(res.body.message).toContain('Cannot deactivate the last active admin');
        });
    });
});
