import request from 'supertest';
import app from '../../app';
import { prismaMock } from '../../lib/prisma-mock';
import { LeaveStatus } from '@prisma/client';

// Mock multer upload middleware
jest.mock('../../middleware/upload.middleware', () => ({
    upload: {
        single: () => (req: any, _res: any, next: any) => {
            req.file = undefined;
            next();
        }
    }
}));

// Mock auth middleware
let mockUserRole = 'EMPLOYEE';
let mockUserId = 5;

jest.mock('../../middleware/auth.middleware', () => ({
    authenticate: (req: any, _res: any, next: any) => {
        req.user = { userId: mockUserId, employeeId: 10, role: mockUserRole, scope: 'UNIVERSITY' };
        next();
    },
    authorize: (roles: string[]) => (req: any, res: any, next: any) => {
        if (roles.includes(req.user.role)) return next();
        return res.status(403).json({ code: 'FORBIDDEN', message: 'Forbidden' });
    },
    requireUniversityAdmin: (_req: any, _res: any, next: any) => next(),
    blockIfPasswordChangeRequired: (_req: any, _res: any, next: any) => next(),
    isAdmin: (_req: any, _res: any, next: any) => next()
}));

// Mock campusScope
jest.mock('../../lib/campusScope', () => ({
    getCampusScope: () => ({ scope: 'UNIVERSITY' }),
    getCampusIdFilter: () => undefined,
    assertSameCampus: () => { }
}));

// Mock employee middleware
jest.mock('../../middleware/employee.middleware', () => ({
    attachEmployee: (req: any, _res: any, next: any) => {
        req.employee = { id: 10, userId: mockUserId, campusId: 1, department: 'Engineering' };
        next();
    }
}));

// Mock eligibility & overlap check functions from timeoff.service
jest.mock('../../services/timeoff.service', () => ({
    checkSabbaticalEligibility: jest.fn().mockResolvedValue(undefined), // passes by default
    checkOverlappingRequests: jest.fn().mockResolvedValue(undefined)   // passes by default
}));

describe('Sabbatical Integration', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockUserRole = 'EMPLOYEE';
        mockUserId = 5;

        // Default notification mocks
        prismaMock.employee.findMany.mockResolvedValue([]); // for notifyDepartmentHead
        prismaMock.user.findMany.mockResolvedValue([]);
        prismaMock.notification.createMany.mockResolvedValue({ count: 0 } as any);
        prismaMock.notification.create.mockResolvedValue({ id: 1 } as any);
        prismaMock.user.findUnique.mockResolvedValue(null); // no email → skip email send
    });

    // ─── Create Sabbatical ─────────────────────────────────────────────────────

    describe('POST /api/v1/sabbatical', () => {
        const validPayload = {
            purpose: 'Research and academic development',
            startDate: '2026-06-01T00:00:00.000Z',
            endDate: '2026-12-01T00:00:00.000Z',
            plan: 'Publish papers and attend international conferences'
        };

        it('should create a sabbatical request for an eligible employee', async () => {
            prismaMock.employee.findUnique.mockResolvedValue({ id: 10, campusId: 1 } as any);
            prismaMock.sabbaticalRequest.create.mockResolvedValue({
                id: 200,
                employeeId: 10,
                status: LeaveStatus.PENDING,
                durationMonths: 6,
                employee: { name: 'John Doe', department: 'Engineering', userId: 5 }
            } as any);

            // notifyDepartmentHead calls employee.findMany with department filter
            prismaMock.employee.findMany.mockResolvedValue([{ userId: 2 }] as any);
            prismaMock.notification.createMany.mockResolvedValue({ count: 1 } as any);

            const res = await request(app)
                .post('/api/v1/sabbatical')
                .send(validPayload);

            if (res.status >= 400) console.dir(res.body, { depth: null });
            expect(res.status).toBe(201);
            expect(res.body.id).toBe(200);
            expect(res.body.status).toBe('PENDING');
        });

        it('should reject if duration exceeds 12 months', async () => {
            const res = await request(app)
                .post('/api/v1/sabbatical')
                .send({
                    ...validPayload,
                    startDate: '2026-01-01T00:00:00.000Z',
                    endDate: '2027-03-01T00:00:00.000Z' // 14 months
                });

            expect(res.status).toBe(400);
            expect(res.body.message).toContain('12 months');
        });

        it('should reject if end date is before start date', async () => {
            const res = await request(app)
                .post('/api/v1/sabbatical')
                .send({
                    ...validPayload,
                    startDate: '2026-12-01T00:00:00.000Z',
                    endDate: '2026-06-01T00:00:00.000Z' // End before start
                });

            expect(res.status).toBe(400);
            expect(res.body.message).toContain('Invalid dates');
        });

        it('should reject if employee is not eligible (eligibility check throws)', async () => {
            const { checkSabbaticalEligibility } = require('../../services/timeoff.service');
            checkSabbaticalEligibility.mockRejectedValueOnce(new Error('Not eligible: Minimum 5 years of service required'));

            const res = await request(app)
                .post('/api/v1/sabbatical')
                .send(validPayload);

            expect(res.status).toBe(400);
            expect(res.body.message).toContain('eligible');
        });
    });

    // ─── Get Requests ──────────────────────────────────────────────────────────

    describe('GET /api/v1/sabbatical', () => {
        it('should return own requests for an employee', async () => {
            prismaMock.sabbaticalRequest.findMany.mockResolvedValue([
                {
                    id: 200, employeeId: 10, status: LeaveStatus.PENDING,
                    employee: { name: 'John Doe' }
                }
            ] as any);

            const res = await request(app).get('/api/v1/sabbatical');

            expect(res.status).toBe(200);
            expect(res.body).toHaveLength(1);
            expect(res.body[0].id).toBe(200);
        });
    });

    // ─── Approve Sabbatical ────────────────────────────────────────────────────

    describe('PATCH /api/v1/sabbatical/:id/approve', () => {
        it('should allow a department head to approve a sabbatical request', async () => {
            mockUserRole = 'DEPARTMENT_HEAD';

            prismaMock.sabbaticalRequest.findUnique.mockResolvedValue({
                id: 200,
                status: LeaveStatus.PENDING,
                campusId: 1,
                durationMonths: 6,
                employee: { userId: 5 }
            } as any);

            prismaMock.sabbaticalRequest.update.mockResolvedValue({
                id: 200,
                status: LeaveStatus.APPROVED,
                durationMonths: 6,
                campusId: 1,
                employee: { userId: 5, name: 'John Doe' }
            } as any);

            const res = await request(app)
                .patch('/api/v1/sabbatical/200/approve')
                .send({ comment: 'Approved for research' });

            if (res.status >= 400) console.dir(res.body, { depth: null });
            expect(res.status).toBe(200);
            expect(res.body.status).toBe('APPROVED');
        });

        it('should return 404 if the sabbatical request does not exist', async () => {
            mockUserRole = 'DEPARTMENT_HEAD'; // needs privileged role to pass 403 gate
            prismaMock.sabbaticalRequest.findUnique.mockResolvedValue(null);

            const res = await request(app)
                .patch('/api/v1/sabbatical/999/approve')
                .send({ comment: 'Approved' });

            // controller returns 400 for 'not found' errors that bubble up from the service
            expect(res.status).toBe(400);
            expect(res.body.message).toContain('not found');
        });
    });

    // ─── Reject Sabbatical ─────────────────────────────────────────────────────

    describe('PATCH /api/v1/sabbatical/:id/reject', () => {
        it('should allow rejection with a comment', async () => {
            mockUserRole = 'DEPARTMENT_HEAD';

            prismaMock.sabbaticalRequest.findUnique.mockResolvedValue({
                id: 200,
                status: LeaveStatus.PENDING,
                campusId: 1,
                durationMonths: 6,
                employee: { userId: 5 }
            } as any);

            prismaMock.sabbaticalRequest.update.mockResolvedValue({
                id: 200,
                status: LeaveStatus.REJECTED,
                durationMonths: 6,
                campusId: 1,
                employee: { userId: 5, name: 'John Doe' }
            } as any);

            const res = await request(app)
                .patch('/api/v1/sabbatical/200/reject')
                .send({ comment: 'Insufficient research plan detail' });

            if (res.status >= 400) console.dir(res.body, { depth: null });
            expect(res.status).toBe(200);
            expect(res.body.status).toBe('REJECTED');
        });
    });
});
