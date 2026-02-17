import request from 'supertest';
import app from '../../app';
import { prismaMock } from '../../lib/prisma-mock';
import { UserRole } from '@prisma/client';

// Note: Integration tests verify end-to-end flows with mocked database
// For full E2E testing with real database, use a separate test environment

describe('Auth Integration', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('POST /api/v1/auth/register', () => {
        it('should return 400 if employee already exists', async () => {
            const userData = {
                name: 'John Doe',
                employeeId: 'EMP001',
                department: 'Engineering',
                password: 'Password123!',
                role: 'EMPLOYEE'
            };

            // Mock existing employee
            prismaMock.employee.findUnique.mockResolvedValue({
                id: 1,
                employeeId: 'EMP001'
            } as any);

            const res = await request(app)
                .post('/api/v1/auth/register')
                .send(userData);

            expect(res.status).toBe(400);
            expect(res.body.error.message).toContain('Employee ID already in use');
        });
    });

    describe('POST /api/v1/auth/login', () => {
        it('should return 401 for non-existent user', async () => {
            const loginData = {
                employeeId: 'NONEXISTENT',
                password: 'Password123!'
            };

            prismaMock.user.findUnique.mockResolvedValue(null);

            const res = await request(app)
                .post('/api/v1/auth/login')
                .send(loginData);

            expect(res.status).toBe(401);
        });

        it('should return 401 for inactive user', async () => {
            const loginData = {
                employeeId: 'EMP001',
                password: 'Password123!'
            };

            prismaMock.user.findUnique.mockResolvedValue({
                id: 1,
                employeeId: 'EMP001',
                passwordHash: 'hashed',
                role: UserRole.EMPLOYEE,
                isActive: false,
                createdAt: new Date(),
                updatedAt: new Date()
            } as any);

            const res = await request(app)
                .post('/api/v1/auth/login')
                .send(loginData);

            expect(res.status).toBe(401);
            expect(res.body.error.message).toContain('Invalid credentials');
        });
    });
});
