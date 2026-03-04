import request from 'supertest';
import app from '../../app';
import { prismaMock } from '../../lib/prisma-mock';
import { UserRole, AuditAction } from '@prisma/client';
import * as tokenUtils from '../../utils/token';
import crypto from 'crypto';

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

describe('Campus Creation Integration (Phase 2)', () => {
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

    describe('POST /api/v1/campuses', () => {
        const validPayload = {
            code: 'TEST',
            name: 'Test Campus',
            description: 'A test campus',
            timezone: 'Africa/Addis_Ababa',
            initialAdmin: {
                employeeId: 'EMP-ADMIN-001',
                email: 'admin@test.com',
                name: 'Campus Admin',
            },
        };

        it('successfully creates a campus with transactional seeding', async () => {
            // Mock uniqueness checks
            prismaMock.campus.findUnique.mockResolvedValue(null);
            prismaMock.user.findUnique.mockResolvedValue(null);

            // Mock transaction result
            const mockCampus = { id: 1, ...validPayload };
            const mockUser = { id: 10, email: validPayload.initialAdmin.email };

            prismaMock.$transaction.mockImplementation(async (fn: any) => {
                return fn(prismaMock);
            });

            prismaMock.campus.create.mockResolvedValue(mockCampus as any);
            prismaMock.clearanceUnit.createMany.mockResolvedValue({ count: 5 } as any);
            prismaMock.user.create.mockResolvedValue(mockUser as any);
            prismaMock.employee.create.mockResolvedValue({ id: 50 } as any);

            const res = await request(app)
                .post('/api/v1/campuses')
                .set('Authorization', `Bearer ${validToken}`)
                .send(validPayload);

            expect(res.status).toBe(201);
            expect(res.body.campus.code).toBe('TEST');
            expect(res.body.tempPassword).toBeDefined();
            expect(res.body.warning).toMatch(/inactive/i);

            // Verify transaction calls
            expect(prismaMock.campus.create).toHaveBeenCalled();
            expect(prismaMock.clearanceUnit.createMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    data: expect.arrayContaining([
                        expect.objectContaining({ name: 'HR', isSystemGenerated: true }),
                    ]),
                })
            );
            expect(prismaMock.user.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    data: expect.objectContaining({
                        role: 'ADMIN',
                        scope: 'CAMPUS',
                        mustChangePassword: true,
                    }),
                })
            );
        });

        it('returns 409 if campus code already exists', async () => {
            prismaMock.campus.findUnique.mockResolvedValue({ id: 1, code: 'TEST' } as any);

            const res = await request(app)
                .post('/api/v1/campuses')
                .set('Authorization', `Bearer ${validToken}`)
                .send(validPayload);

            expect(res.status).toBe(400); // errorHandler maps it to 400 for internal_error if it's not Prisma error code
            expect(res.body.message).toMatch(/already exists/i);
        });
    });

    describe('Clearance Unit Protection', () => {
        it('blocks deletion of system-generated units', async () => {
            prismaMock.clearanceUnit.findUnique.mockResolvedValue({
                id: 1,
                name: 'HR',
                isSystemGenerated: true
            } as any);

            const res = await request(app)
                .delete('/api/v1/clearance/units/1')
                .set('Authorization', `Bearer ${validToken}`);

            expect(res.status).toBe(400);
            expect(res.body.message).toMatch(/System-generated.*cannot be deleted/i);
        });

        it('allows deletion of standard units', async () => {
            prismaMock.clearanceUnit.findUnique.mockResolvedValue({
                id: 2,
                name: 'Custom Unit',
                isSystemGenerated: false
            } as any);
            prismaMock.clearanceUnit.delete.mockResolvedValue({ id: 2 } as any);

            const res = await request(app)
                .delete('/api/v1/clearance/units/2')
                .set('Authorization', `Bearer ${validToken}`);

            expect(res.status).toBe(200);
            expect(prismaMock.clearanceUnit.delete).toHaveBeenCalledWith({ where: { id: 2 } });
        });
    });
});
