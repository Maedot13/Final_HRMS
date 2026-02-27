import request from 'supertest';
import app from '../../app';
import { prismaMock } from '../../lib/prisma-mock';
import jwt from 'jsonwebtoken';
import { UserRole } from '@prisma/client';

describe('System Utility Integration', () => {
    let adminToken: string;
    let employeeToken: string;

    beforeAll(() => {
        // Generate valid tokens
        const jwtSecret = process.env.JWT_SECRET || 'secret';
        adminToken = jwt.sign(
            { userId: 1, role: UserRole.ADMIN, scope: 'UNIVERSITY' },
            jwtSecret,
            { expiresIn: '1h' }
        );
        employeeToken = jwt.sign(
            { userId: 2, role: UserRole.EMPLOYEE, scope: 'CAMPUS', campusId: 1 },
            jwtSecret,
            { expiresIn: '1h' }
        );
    });

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('Notifications', () => {
        it('should fetch user notifications', async () => {
            prismaMock.notification.findMany.mockResolvedValue([
                { id: 1, userId: 2, title: 'Test Alert', message: 'Test message', isRead: false } as any
            ]);

            const res = await request(app)
                .get('/api/v1/notifications')
                .set('Authorization', `Bearer ${employeeToken}`);

            expect(res.status).toBe(200);
            expect(res.body).toHaveLength(1);
            expect(res.body[0].title).toBe('Test Alert');
        });

        it('should get unread count', async () => {
            prismaMock.notification.count.mockResolvedValue(5);

            const res = await request(app)
                .get('/api/v1/notifications/unread-count')
                .set('Authorization', `Bearer ${employeeToken}`);

            expect(res.status).toBe(200);
            expect(res.body.count).toBe(5);
        });

        it('should mark all as read', async () => {
            prismaMock.notification.updateMany.mockResolvedValue({ count: 5 });

            const res = await request(app)
                .patch('/api/v1/notifications/read-all')
                .set('Authorization', `Bearer ${employeeToken}`);

            expect(res.status).toBe(200);
            expect(res.body.message).toBe('All notifications marked as read');
        });

        it('should mark a specific notification as read', async () => {
            prismaMock.notification.updateMany.mockResolvedValue({ count: 1 });

            const res = await request(app)
                .patch('/api/v1/notifications/1/read')
                .set('Authorization', `Bearer ${employeeToken}`);

            expect(res.status).toBe(200);
            expect(res.body.message).toBe('Notification marked as read');
        });
    });

    describe('Reports', () => {
        it('should fetch dashboard summary for Admin', async () => {
            prismaMock.employee.count.mockResolvedValue(100);
            prismaMock.leaveRequest.count.mockResolvedValue(10);
            prismaMock.sabbaticalRequest.count.mockResolvedValue(2);
            prismaMock.clearanceRequest.count.mockResolvedValue(5);
            prismaMock.jobPosting.count.mockResolvedValue(5);

            const res = await request(app)
                .get('/api/v1/reports/summary')
                .set('Authorization', `Bearer ${adminToken}`);

            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('employeeCount', 100);
        });

        it('should block Employee from fetching reports', async () => {
            const res = await request(app)
                .get('/api/v1/reports/summary')
                .set('Authorization', `Bearer ${employeeToken}`);

            expect(res.status).toBe(403);
        });
    });

    describe('Audit Logs', () => {
        const mockAuditLog = {
            id: 1,
            userId: 1,
            action: 'LOGIN',
            entityType: 'Auth',
            entityId: 0,
            ipAddress: '127.0.0.1',
            timestamp: new Date()
        };

        it('should fetch all audit logs for Admin', async () => {
            // Because audit access itself is audited, mock that creation
            prismaMock.auditLog.create.mockResolvedValue({} as any);
            prismaMock.auditLog.findMany.mockResolvedValue([mockAuditLog as any]);
            prismaMock.auditLog.count.mockResolvedValue(1);

            const res = await request(app)
                .get('/api/v1/audit-logs')
                .set('Authorization', `Bearer ${adminToken}`);

            expect(res.status).toBe(200);
            expect(res.body.data).toHaveLength(1);
            expect(res.body.pagination.total).toBe(1);
        });

        it('should block Employee from fetching all audit logs', async () => {
            const res = await request(app)
                .get('/api/v1/audit-logs')
                .set('Authorization', `Bearer ${employeeToken}`);

            expect(res.status).toBe(403);
        });

        it('should allow user to fetch their own audit logs', async () => {
            prismaMock.auditLog.findMany.mockResolvedValue([mockAuditLog as any]);
            prismaMock.auditLog.count.mockResolvedValue(1);

            const res = await request(app)
                .get('/api/v1/audit-logs/my-logs')
                .set('Authorization', `Bearer ${employeeToken}`);

            expect(res.status).toBe(200);
            expect(res.body.data).toHaveLength(1);
        });
    });
});
