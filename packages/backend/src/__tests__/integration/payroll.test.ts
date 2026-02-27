import request from 'supertest';
import app from '../../app';
import { prismaMock } from '../../lib/prisma-mock';
import { PAYROLL_CONSTANTS } from '../../config/constants';

// Mock auth middleware to control user role
jest.mock('../../middleware/auth.middleware', () => ({
    authenticate: (req: any, _res: any, next: any) => {
        // Default to Finance Officer for tests
        req.user = { userId: 1, role: 'FINANCE_OFFICER', scope: 'UNIVERSITY' };
        next();
    },
    authorize: (roles: string[]) => (req: any, res: any, next: any) => {
        if (roles.includes(req.user.role)) return next();
        return res.status(403).json({ error: { message: 'Forbidden' } });
    },
    requireUniversityAdmin: (req: any, res: any, next: any) => {
        if (req.user.scope === 'UNIVERSITY' && req.user.role === 'ADMIN') return next();
        return res.status(403).json({ error: { message: 'Forbidden' } });
    },
    blockIfPasswordChangeRequired: (req: any, res: any, next: any) => next()
}));

// Provide campusScope mock
jest.mock('../../lib/campusScope', () => ({
    getCampusScope: () => ({ scope: 'UNIVERSITY' }),
    getCampusIdFilter: () => undefined,
    assertSameCampus: () => { }
}));

describe('Payroll Integration', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('GET /api/v1/payroll/data-transfer', () => {
        it('should return 400 if validation fails (invalid month or year)', async () => {
            const res = await request(app).get('/api/v1/payroll/data-transfer?month=15&year=abc');

            expect(res.status).toBe(400);
            expect(res.body.code).toBe('VALIDATION_ERROR');
        });

        it('should return empty payroll data when no employees exist', async () => {
            // Mock empty active employees
            prismaMock.employee.findMany
                .mockResolvedValueOnce([]) // activeEmployees query
                .mockResolvedValueOnce([]); // exitedEmployees query

            const res = await request(app).get('/api/v1/payroll/data-transfer?month=1&year=2024');

            if (res.status >= 400) console.dir(res.body, { depth: null });

            expect(res.status).toBe(200);
            expect(res.body.count).toBe(0);
            expect(res.body.data).toEqual([]);
        });

        it('should calculate payable days correctly for standard active employees', async () => {
            const hireDate = new Date('2022-01-01');

            prismaMock.employee.findMany
                .mockResolvedValueOnce([{
                    employeeId: 'EMP001',
                    name: 'Standard Active',
                    department: 'Engineering',
                    grossSalary: 5000,
                    salaryType: 'MONTHLY',
                    hireDate,
                    user: { isActive: true }
                }] as any)
                .mockResolvedValueOnce([]); // No exited employees

            const res = await request(app).get('/api/v1/payroll/data-transfer?month=3&year=2024');

            expect(res.status).toBe(200);
            expect(res.body.count).toBe(1);
            expect(res.body.data[0].payableDays).toBe(PAYROLL_CONSTANTS.STANDARD_MONTH_DAYS); // Usually 30
            expect(res.body.data[0].status).toBe('ACTIVE');
        });

        it('should calculate payable days correctly for new hires (mid-month)', async () => {
            // Hired on the 15th of the month
            const hireDate = new Date('2024-03-15');

            prismaMock.employee.findMany
                .mockResolvedValueOnce([{
                    employeeId: 'EMP002',
                    name: 'New Hire',
                    department: 'Sales',
                    grossSalary: 4000,
                    salaryType: 'MONTHLY',
                    hireDate,
                    user: { isActive: true }
                }] as any)
                .mockResolvedValueOnce([]); // No exited employees

            const res = await request(app).get('/api/v1/payroll/data-transfer?month=3&year=2024');

            expect(res.status).toBe(200);
            expect(res.body.count).toBe(1);

            // March has 31 days. 31 - 15 + 1 = 17 days
            expect(res.body.data[0].payableDays).toBe(17);
            expect(res.body.data[0].notes).toContain('Partial Payment - New Hire');
        });

        it('should calculate payable days correctly for exited employees', async () => {
            // Hired beforehand
            const hireDate = new Date('2023-01-01');
            // Exited on the 10th
            const exitDate = new Date('2024-03-10');

            prismaMock.employee.findMany
                .mockResolvedValueOnce([]) // No active employees
                .mockResolvedValueOnce([{
                    employeeId: 'EMP003',
                    name: 'Exited Employee',
                    department: 'HR',
                    grossSalary: 6000,
                    salaryType: 'MONTHLY',
                    hireDate,
                    user: { isActive: false },
                    payrollTransfers: [{
                        effectiveDate: exitDate
                    }]
                }] as any);

            const res = await request(app).get('/api/v1/payroll/data-transfer?month=3&year=2024');

            expect(res.status).toBe(200);
            expect(res.body.count).toBe(1);

            // Exit date is 10th. Days from 1st to 10th (inclusive) = 10
            expect(res.body.data[0].payableDays).toBe(10);
            expect(res.body.data[0].status).toBe('EXITED');
            expect(res.body.data[0].notes).toContain('Exited this month');
        });
    });
});
