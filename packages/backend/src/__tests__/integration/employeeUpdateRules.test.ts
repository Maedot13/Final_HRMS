import request from 'supertest';
import app from '../../app';
import { prismaMock } from '../../lib/prisma-mock';
import * as tokenUtils from '../../utils/token';
import { redis } from '../../lib/redis';

jest.mock('../../utils/token');

// Mock Redis to prevent real connection attempts during tests
jest.mock('../../lib/redis', () => ({
    redis: {
        del: jest.fn().mockResolvedValue(1),
        get: jest.fn().mockResolvedValue(null),
        set: jest.fn(),
        quit: jest.fn(),
    },
}));

describe('Employee Update Rules', () => {
    const campusAId = 1;
    const validToken = 'valid.jwt.token';

    const campusAHR = {
        userId: 2,
        role: 'HR_OFFICER',
        scope: 'CAMPUS',
        campusId: campusAId,
    };

    const centralHR = {
        userId: 99,
        role: 'HR_OFFICER',
        scope: 'UNIVERSITY',
        campusId: null,
    };

    const employeeBase = {
        id: 100,
        userId: 101,
        campusId: campusAId,
        employeeId: 'EMP-A-001',
        name: 'Campus A Employee',
        departmentId: 10,
        position: 'Developer',
        hireDate: new Date(),
        serviceYears: 2,
        grossSalary: 50000,
        salaryType: 'MONTHLY',
        employmentStatus: 'ACTIVE',
        contactInfo: {},
    };

    beforeEach(() => {
        jest.clearAllMocks();
        prismaMock.employee.findUnique.mockResolvedValue(employeeBase as any);
        prismaMock.employee.update.mockImplementation((args: any) => Promise.resolve({ ...employeeBase, ...(args?.data || {}) }) as any);
        prismaMock.auditLog.create.mockResolvedValue({} as any);
    });

    describe('PATCH /api/v1/employees/:id', () => {
        it('Campus Admin (CAMPUS scope) updating operational fields succeeds', async () => {
            (tokenUtils.verifyToken as jest.Mock).mockReturnValue(campusAHR);

            const res = await request(app)
                .patch('/api/v1/employees/100')
                .set('Authorization', `Bearer ${validToken}`)
                .send({ position: 'Senior Developer' });

            expect(res.status).toBe(200);
            expect(prismaMock.employee.update).toHaveBeenCalledWith(
                expect.objectContaining({
                    data: expect.objectContaining({ position: 'Senior Developer' }),
                })
            );
        });

        it('Campus Admin (CAMPUS scope) updating financial fields returns a validation error', async () => {
            (tokenUtils.verifyToken as jest.Mock).mockReturnValue(campusAHR);

            const res = await request(app)
                .patch('/api/v1/employees/100')
                .set('Authorization', `Bearer ${validToken}`)
                .send({ grossSalary: 90000, payGrade: 'A1', position: 'Manager' });

            expect(res.status).toBe(400);
            expect(res.body.code).toBe('VALIDATION_ERROR');
            expect(prismaMock.employee.update).not.toHaveBeenCalled();
        });

        it('Central HR (UNIVERSITY scope) updating financial fields succeeds', async () => {
            (tokenUtils.verifyToken as jest.Mock).mockReturnValue(centralHR);

            const res = await request(app)
                .patch('/api/v1/employees/100')
                .set('Authorization', `Bearer ${validToken}`)
                .send({ grossSalary: 95000, payGrade: 'A2' });

            expect(res.status).toBe(200);
            expect(prismaMock.employee.update).toHaveBeenCalledWith(
                expect.objectContaining({
                    data: expect.objectContaining({ grossSalary: 95000, payGrade: 'A2' }),
                })
            );
        });
    });
});
