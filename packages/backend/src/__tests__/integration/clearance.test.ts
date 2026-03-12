import request from 'supertest';
import app from '../../app';
import { prismaMock } from '../../lib/prisma-mock';
import { ClearanceStatus } from '@prisma/client';

// Mock auth middleware to control user role/campus
jest.mock('../../middleware/auth.middleware', () => ({
    authenticate: (req: any, _res: any, next: any) => {
        // Default to a campus HR officer for tests
        req.user = { userId: 1, role: 'HR_OFFICER', scope: 'CAMPUS', campusId: 1, employeeId: 'EMP001' };
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

// Mock authorization service
jest.mock('../../services/authorization.service', () => ({
    canApproveForUnit: jest.fn().mockResolvedValue(true)
}));

// Mock event bus
jest.mock('../../services/eventBus.service', () => ({
    dispatchEvent: jest.fn().mockResolvedValue(undefined),
    SystemEventTypes: {
        CLEARANCE_COMPLETED: 'CLEARANCE_COMPLETED',
        CLEARANCE_UNIT_APPROVED: 'CLEARANCE_UNIT_APPROVED',
        CLEARANCE_UNIT_REJECTED: 'CLEARANCE_UNIT_REJECTED'
    }
}));

import { dispatchEvent, SystemEventTypes } from '../../services/eventBus.service';

describe('Clearance Integration', () => {
    beforeEach(() => {
        jest.clearAllMocks();

        prismaMock.employee.findUnique.mockResolvedValue({
            id: 1,
            campusId: 1,
            department: 'Engineering',
            name: 'John Doe',
            userId: 1
        } as any);

        prismaMock.user.findMany.mockResolvedValue([{ id: 1 }] as any);
        prismaMock.notification.createMany.mockResolvedValue({ count: 1 } as any);
    });

    describe('POST /api/v1/clearance/requests', () => {
        it('should initiate a clearance request', async () => {
            const lastWorkingDate = new Date();
            lastWorkingDate.setDate(lastWorkingDate.getDate() + 30);

            const clearanceData = {
                reason: 'Resignation for better opportunity',
                lastWorkingDay: lastWorkingDate.toISOString().split('T')[0]
            };

            // Mock no existing active clearance
            prismaMock.clearanceRequest.findFirst.mockResolvedValue(null);



            // Mock active units
            prismaMock.clearanceUnit.findMany.mockResolvedValue([
                { id: 1, name: 'HR', isActive: true, campusId: 1 },
                { id: 2, name: 'Finance', isActive: true, campusId: 1 }
            ] as any);

            // Mock creation
            prismaMock.clearanceRequest.create.mockResolvedValue({
                id: 100,
                employeeId: 1,
                status: ClearanceStatus.PENDING,
                checks: []
            } as any);

            // Mock findUnique for notification logic
            prismaMock.clearanceRequest.findUnique.mockResolvedValue({
                id: 100,
                campusId: 1,
                employee: { id: 1, name: 'John Doe', department: 'Engineering', userId: 1 }
            } as any);

            const res = await request(app)
                .post('/api/v1/clearance/requests')
                .send(clearanceData);

            if (res.status >= 400) console.dir(res.body, { depth: null });

            expect(res.status).toBe(201);
            expect(res.body.status).toBe('PENDING');
            expect(res.body.id).toBe(100);
            expect(prismaMock.clearanceRequest.create).toHaveBeenCalled();
        });

        it('should return 400 if an active clearance already exists', async () => {
            prismaMock.clearanceRequest.findFirst.mockResolvedValue({ id: 99 } as any);

            const lastWorkingDate = new Date();
            lastWorkingDate.setDate(lastWorkingDate.getDate() + 30);

            const res = await request(app)
                .post('/api/v1/clearance/requests')
                .send({ reason: 'Validation text length', lastWorkingDay: lastWorkingDate.toISOString().split('T')[0] });

            expect(res.status).toBe(400);
            expect(res.body.message).toContain('Active clearance request already exists');
        });
    });

    describe('GET /api/v1/clearance/requests/:id', () => {
        it('should return clearance details', async () => {
            prismaMock.clearanceRequest.findUnique.mockResolvedValue({
                id: 100,
                campusId: 1,
                employeeId: 1,
                employee: { name: 'John Doe', employeeId: 'EMP001' },
                checks: [
                    { id: 1, unit: { name: 'HR' }, status: 'PENDING' }
                ]
            } as any);

            const res = await request(app).get('/api/v1/clearance/requests/100');

            expect(res.status).toBe(200);
            expect(res.body.id).toBe(100);
            expect(res.body.employee.name).toBe('John Doe');
        });

        it('should return 404 if request not found', async () => {
            prismaMock.clearanceRequest.findUnique.mockResolvedValue(null);
            const res = await request(app).get('/api/v1/clearance/requests/999');
            expect(res.status).toBe(404);
        });
    });

    describe('PATCH /api/v1/clearance/requests/:id/approve-check', () => {
        it('should approve a clearance check', async () => {
            // Mock findUnique for campus isolation check and notification
            prismaMock.clearanceRequest.findUnique.mockResolvedValue({
                id: 100,
                campusId: 1,
                employee: { userId: 5, name: 'John Doe' }
            } as any);

            // Mock transaction results
            prismaMock.clearanceCheck.findUnique.mockResolvedValue({
                id: 1,
                clearanceId: 100,
                unitId: 1,
                status: ClearanceStatus.PENDING
            } as any);

            prismaMock.clearanceCheck.count.mockResolvedValue(1); // Still 1 pending check (others)

            // Mock transaction execution
            prismaMock.$transaction.mockImplementation(async (callback: any) => await callback(prismaMock));

            const res = await request(app)
                .patch('/api/v1/clearance/requests/100/approve-check')
                .send({ unitId: 1, comment: 'Looks good' });



            expect(res.status).toBe(200);
            expect(res.body.status).toBe('PROGRESS');
            expect(prismaMock.clearanceCheck.update).toHaveBeenCalledWith(expect.objectContaining({
                data: expect.objectContaining({ status: ClearanceStatus.APPROVED })
            }));
        });

        it('should complete clearance when last check is approved', async () => {
            prismaMock.clearanceRequest.findUnique.mockResolvedValue({
                id: 100,
                campusId: 1,
                employeeId: 1,
                employee: { userId: 5, name: 'John Doe' }
            } as any);

            prismaMock.clearanceCheck.findUnique.mockResolvedValue({
                id: 1,
                clearanceId: 100,
                unitId: 1,
                status: ClearanceStatus.PENDING
            } as any);

            prismaMock.clearanceCheck.count.mockResolvedValue(0); // 0 pending checks!

            prismaMock.clearanceRequest.update.mockResolvedValue({
                id: 100,
                status: ClearanceStatus.APPROVED,
                employee: { userId: 5, name: 'John Doe' }
            } as any);

            prismaMock.payrollTransfer.create.mockResolvedValue({} as any);

            prismaMock.$transaction.mockImplementation(async (callback: any) => await callback(prismaMock));

            const res = await request(app)
                .patch('/api/v1/clearance/requests/100/approve-check')
                .send({ unitId: 1 });



            expect(res.status).toBe(200);
            expect(res.body.status).toBe('COMPLETED');
            expect(prismaMock.clearanceRequest.update).toHaveBeenCalledWith(expect.objectContaining({
                where: { id: 100 },
                data: { status: ClearanceStatus.APPROVED }
            }));
            expect(dispatchEvent).toHaveBeenCalledWith(SystemEventTypes.CLEARANCE_COMPLETED, expect.any(Object));
        });
    });
});
