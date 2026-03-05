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

describe('Campus Pattern Locking (Phase 2)', () => {
    const universityAdmin = {
        userId: 1,
        role: UserRole.ADMIN,
        scope: 'UNIVERSITY' as const,
        campusId: null,
        employeeId: 'EMP-SUPER',
    };

    const validToken = 'valid-token';

    beforeEach(() => {
        jest.clearAllMocks();
        (tokenUtils.verifyToken as jest.Mock).mockReturnValue(universityAdmin);
    });

    describe('PATCH /api/v1/campuses/:id', () => {
        it('returns 400 when trying to update prefix on a locked campus', async () => {
            // Mock existing campus that is LOCKED
            prismaMock.campus.findUnique.mockResolvedValue({
                id: 1,
                code: 'BDU',
                name: 'Bahir Dar University',
                employeeIdPrefix: 'BDU',
                employeeNumericLength: 4,
                isPatternLocked: true,
                isActive: false,
            } as any);

            const res = await request(app)
                .patch('/api/v1/campuses/1')
                .set('Authorization', `Bearer ${validToken}`)
                .send({ employeeIdPrefix: 'FAIL' });

            expect(res.status).toBe(400);
            expect(res.body.message).toMatch(/pattern is locked/i);
            expect(res.body.message).toMatch(/"BDU"/);
        });

        it('allows updating name and description even when pattern is locked', async () => {
            prismaMock.campus.findUnique.mockResolvedValue({
                id: 1,
                code: 'BDU',
                name: 'Old Name',
                isPatternLocked: true,
            } as any);

            prismaMock.campus.update.mockResolvedValue({
                id: 1,
                name: 'New Name',
            } as any);

            const res = await request(app)
                .patch('/api/v1/campuses/1')
                .set('Authorization', `Bearer ${validToken}`)
                .send({ name: 'New Name' });

            expect(res.status).toBe(200);
            expect(res.body.name).toBe('New Name');
        });
    });
});
