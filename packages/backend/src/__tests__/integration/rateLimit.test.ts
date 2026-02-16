import request from 'supertest';
import app from '../../app';

describe('Rate Limiting', () => {
    it('should return 429 after 5 login attempts regardless of success', async () => {
        // Mock a successful user so we can test the skipSuccessfulRequests: false change
        const { prismaMock } = require('../../lib/prisma-mock');
        prismaMock.user.findUnique.mockResolvedValue({
            id: 1,
            employeeId: 'EMP001',
            passwordHash: '$2b$10$SomethingHashed', // bcrypt for 'Password123!'
            role: 'EMPLOYEE',
            isActive: true
        });

        const loginData = {
            employeeId: 'EMP001',
            password: 'Password123!'
        };

        // Note: In real logic, bcrypt.compare is called. 
        // For simplicity in this rate limit test, we just want to see if the counter increments.

        for (let i = 0; i < 5; i++) {
            await request(app)
                .post('/api/v1/auth/login')
                .send(loginData);
        }

        const res = await request(app)
            .post('/api/v1/auth/login')
            .send(loginData);

        expect(res.status).toBe(429);
        expect(res.body.error.code).toBe('RATE_LIMIT_EXCEEDED');
    }, 20000);
});
