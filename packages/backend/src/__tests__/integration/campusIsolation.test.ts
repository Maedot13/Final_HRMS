/**
 * Phase 4: Integration tests for campus isolation.
 * Verifies that campus-scoped users cannot access data from other campuses,
 * while university admins can access all campuses.
 */
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

describe('Campus Isolation Integration', () => {
  const campusAId = 1;
  const campusBId = 2;

  const campusAHR = {
    userId: 10,
    role: UserRole.HR_OFFICER,
    scope: 'CAMPUS' as const,
    campusId: campusAId,
    employeeId: 'EMP-A-HR',
  };

  const campusBHR = {
    userId: 20,
    role: UserRole.HR_OFFICER,
    scope: 'CAMPUS' as const,
    campusId: campusBId,
    employeeId: 'EMP-B-HR',
  };

  const campusBDeptHead = {
    userId: 21,
    role: UserRole.DEPARTMENT_HEAD,
    scope: 'CAMPUS' as const,
    campusId: campusBId,
    employeeId: 'EMP-B-DH',
  };

  const universityAdmin = {
    userId: 30,
    role: UserRole.ADMIN,
    scope: 'UNIVERSITY' as const,
    campusId: null,
    employeeId: 'EMP-SUPER',
  };

  const validToken = 'valid-token';

  beforeEach(() => {
    jest.clearAllMocks();
    (tokenUtils.verifyToken as jest.Mock).mockReturnValue(campusAHR);
  });

  describe('Employees', () => {
    describe('GET /api/v1/employees/:id', () => {
      it('returns 403 when Campus A HR tries to fetch Campus B employee', async () => {
        (tokenUtils.verifyToken as jest.Mock).mockReturnValue(campusAHR);

        prismaMock.employee.findUnique.mockResolvedValue({
          id: 100,
          userId: 101,
          campusId: campusBId,
          employeeId: 'EMP-B-001',
          name: 'Campus B Employee',
          department: 'Engineering',
          position: 'Developer',
          hireDate: new Date(),
          serviceYears: 2,
          grossSalary: 50000,
          salaryType: 'MONTHLY',
          contactInfo: {},
        } as any);

        const res = await request(app)
          .get('/api/v1/employees/100')
          .set('Authorization', `Bearer ${validToken}`);

        expect(res.status).toBe(403);
        expect(res.body?.message || JSON.stringify(res.body)).toMatch(/Forbidden|Cross-campus/i);
      });

      it('returns 200 when Campus A HR fetches Campus A employee', async () => {
        (tokenUtils.verifyToken as jest.Mock).mockReturnValue(campusAHR);

        const employeeData = {
          id: 50,
          userId: 51,
          campusId: campusAId,
          employeeId: 'EMP-A-001',
          name: 'Campus A Employee',
          department: 'Engineering',
          position: 'Developer',
          hireDate: new Date(),
          serviceYears: 2,
          grossSalary: 50000,
          salaryType: 'MONTHLY',
          contactInfo: {},
        };
        prismaMock.employee.findUnique.mockResolvedValue(employeeData as any);

        const res = await request(app)
          .get('/api/v1/employees/50')
          .set('Authorization', `Bearer ${validToken}`);

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('id', 50);
      });

      it('returns 200 when University admin fetches any employee', async () => {
        (tokenUtils.verifyToken as jest.Mock).mockReturnValue(universityAdmin);

        prismaMock.employee.findUnique.mockResolvedValue({
          id: 100,
          userId: 101,
          campusId: campusBId,
          employeeId: 'EMP-B-001',
          name: 'Campus B Employee',
          department: 'Engineering',
          position: 'Developer',
          hireDate: new Date(),
          serviceYears: 2,
          grossSalary: 50000,
          salaryType: 'MONTHLY',
          contactInfo: {},
        } as any);

        const res = await request(app)
          .get('/api/v1/employees/100')
          .set('Authorization', `Bearer ${validToken}`);

        expect(res.status).toBe(200);
      });
    });
  });

  describe('Leave', () => {
    describe('PATCH /api/v1/leave/:id/approve', () => {
      it('returns 403 when Campus B Dept Head approves Campus A leave request', async () => {
        (tokenUtils.verifyToken as jest.Mock).mockReturnValue(campusBDeptHead);

        prismaMock.$transaction.mockImplementation(((fn: (tx: unknown) => unknown) =>
          fn(prismaMock)) as never);

        prismaMock.employee.findUnique.mockResolvedValue({
          id: 21,
          userId: 21,
          department: 'Engineering',
          campusId: campusBId,
        } as any);

        prismaMock.leaveRequest.findUnique.mockResolvedValue({
          id: 1,
          employeeId: 50,
          campusId: campusAId,
          status: 'PENDING',
          startDate: new Date('2025-06-01'),
          leaveType: 'ANNUAL',
          days: 5,
          employee: {
            id: 50,
            department: 'Engineering',
            name: 'Campus A Employee',
          },
        } as any);

        const res = await request(app)
          .patch('/api/v1/leave/1/approve')
          .set('Authorization', `Bearer ${validToken}`)
          .send({ comment: 'Approved' });

        expect(res.status).toBe(403);
      });
    });
  });

  describe('Recruitment', () => {
    describe('GET /api/v1/recruitment/postings', () => {
      it('Campus B HR only sees Campus B job postings', async () => {
        (tokenUtils.verifyToken as jest.Mock).mockReturnValue(campusBHR);

        prismaMock.jobPosting.findMany.mockResolvedValue([
          {
            id: 1,
            title: 'Campus B Job',
            campusId: campusBId,
            status: 'OPEN',
          },
        ] as any);

        const res = await request(app)
          .get('/api/v1/recruitment/postings')
          .set('Authorization', `Bearer ${validToken}`);

        expect(res.status).toBe(200);
        expect(prismaMock.jobPosting.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({ campusId: campusBId }),
          })
        );
      });
    });
  });

  describe('Clearance', () => {
    describe('GET /api/v1/clearance/requests/:id', () => {
      it('returns 403 when Campus A user fetches Campus B clearance', async () => {
        (tokenUtils.verifyToken as jest.Mock).mockReturnValue(campusAHR);

        prismaMock.clearanceRequest.findUnique.mockResolvedValue({
          id: 1,
          campusId: campusBId,
          employeeId: 100,
          status: 'PENDING',
          employee: { employeeId: 'EMP-B', name: 'B Employee' },
          checks: [],
        } as any);

        const res = await request(app)
          .get('/api/v1/clearance/requests/1')
          .set('Authorization', `Bearer ${validToken}`);

        expect(res.status).toBe(403);
      });
    });
  });

  describe('Audit logs', () => {
    describe('GET /api/v1/audit-logs', () => {
      it('Campus A HR only receives Campus A audit logs', async () => {
        (tokenUtils.verifyToken as jest.Mock).mockReturnValue(campusAHR);

        prismaMock.auditLog.findMany.mockResolvedValue([
          { id: 1, campusId: campusAId, action: 'CREATE', entityType: 'Employee' },
        ] as any);
        prismaMock.auditLog.count.mockResolvedValue(1);

        const res = await request(app)
          .get('/api/v1/audit-logs')
          .set('Authorization', `Bearer ${validToken}`);

        expect(res.status).toBe(200);
        expect(prismaMock.auditLog.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({ campusId: campusAId }),
          })
        );
      });
    });

    describe('GET /api/v1/audit-logs/:id', () => {
      it('returns 403 when Campus A HR fetches Campus B audit log', async () => {
        (tokenUtils.verifyToken as jest.Mock).mockReturnValue(campusAHR);

        prismaMock.auditLog.findUnique.mockResolvedValue({
          id: 99,
          campusId: campusBId,
          action: 'CREATE',
          entityType: 'Employee',
        } as any);

        const res = await request(app)
          .get('/api/v1/audit-logs/99')
          .set('Authorization', `Bearer ${validToken}`);

        expect(res.status).toBe(403);
      });
    });
  });
});
