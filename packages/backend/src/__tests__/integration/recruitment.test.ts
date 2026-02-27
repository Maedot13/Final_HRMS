import request from 'supertest';
import app from '../../app';
import { prismaMock } from '../../lib/prisma-mock';
import { JobStatus, ApplicationStatus } from '@prisma/client';

// Mock multer upload middleware
jest.mock('../../middleware/upload.middleware', () => ({
    upload: {
        single: () => (req: any, _res: any, next: any) => {
            req.file = { path: 'https://example.com/cv.pdf' };
            next();
        }
    }
}));

// Mock auth middleware — user role is overridden per describe block via beforeEach
let mockUserRole = 'HR_OFFICER';
let mockUserId = 1;

jest.mock('../../middleware/auth.middleware', () => ({
    authenticate: (req: any, _res: any, next: any) => {
        req.user = { userId: mockUserId, role: mockUserRole, scope: 'UNIVERSITY' };
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
        req.employee = { id: 10, userId: mockUserId, campusId: 1 };
        next();
    }
}));

describe('Recruitment Integration', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        // Default: HR Officer (for posting/management endpoints)
        mockUserRole = 'HR_OFFICER';
        mockUserId = 1;
    });

    // ─── Job Postings ─────────────────────────────────────────────────────────

    describe('GET /api/v1/recruitment/postings', () => {
        it('should return a list of job postings', async () => {
            prismaMock.jobPosting.findMany.mockResolvedValue([
                { id: 1, title: 'Software Engineer', status: JobStatus.OPEN }
            ] as any);

            const res = await request(app).get('/api/v1/recruitment/postings');

            expect(res.status).toBe(200);
            expect(res.body).toHaveLength(1);
            expect(res.body[0].title).toBe('Software Engineer');
        });
    });

    describe('POST /api/v1/recruitment/postings', () => {
        const jobData = {
            title: 'Software Engineer',
            description: 'Build great software products',
            requirements: 'Node.js, TypeScript, React',
            department: 'Engineering',
            position: 'Senior Engineer',
            deadline: '2027-12-31'
        };

        it('should create a job posting for authorized user (HR_OFFICER)', async () => {
            // createJobPosting calls prisma.user.findUnique to get campusId
            prismaMock.user.findUnique.mockResolvedValue({ campusId: null } as any);
            prismaMock.jobPosting.create.mockResolvedValue({
                id: 1,
                ...jobData,
                status: JobStatus.OPEN,
                campusId: null,
                createdAt: new Date(),
                createdBy: 1,
                deadline: new Date(jobData.deadline)
            } as any);

            const res = await request(app)
                .post('/api/v1/recruitment/postings')
                .send(jobData);

            if (res.status >= 400) console.dir(res.body, { depth: null });
            expect(res.status).toBe(201);
            expect(res.body.title).toBe('Software Engineer');
        });

        it('should block job posting creation for unauthorized role (EMPLOYEE)', async () => {
            mockUserRole = 'EMPLOYEE';

            const res = await request(app)
                .post('/api/v1/recruitment/postings')
                .send(jobData);

            expect(res.status).toBe(403);
            expect(prismaMock.jobPosting.create).not.toHaveBeenCalled();
        });
    });

    // ─── Apply for Job ────────────────────────────────────────────────────────

    describe('POST /api/v1/recruitment/apply', () => {
        const applyPayload = {
            jobPostingId: 1,
            coverLetter: 'I am a great fit for this position with many years of experience.',
            cvUrl: 'https://example.com/cv.pdf'
        };

        beforeEach(() => {
            // Apply tests require EMPLOYEE role (HR_OFFICER is blocked by service)
            mockUserRole = 'EMPLOYEE';
            mockUserId = 5;
        });

        it('should allow an employee to apply for an open job', async () => {
            prismaMock.jobPosting.findUnique
                .mockResolvedValueOnce({
                    id: 1,
                    status: JobStatus.OPEN,
                    deadline: new Date('2027-12-31'),
                    createdBy: 99 // Different user — not creator
                } as any)
                .mockResolvedValueOnce({ id: 1, title: 'Engineer' } as any); // fetched again for email

            prismaMock.jobApplication.findUnique.mockResolvedValue(null); // No existing application
            prismaMock.user.findUnique.mockResolvedValue({
                id: 5, email: 'emp@test.com',
                employee: { name: 'John Doe' }
            } as any);
            prismaMock.jobApplication.create.mockResolvedValue({
                id: 100, jobPostingId: 1, employeeId: 10,
                status: ApplicationStatus.SUBMITTED
            } as any);

            const res = await request(app)
                .post('/api/v1/recruitment/apply')
                .send(applyPayload);

            if (res.status >= 400) console.dir(res.body, { depth: null });
            expect(res.status).toBe(201);
            expect(res.body.id).toBe(100);
        });

        it('should reject application if deadline has passed', async () => {
            prismaMock.jobPosting.findUnique.mockResolvedValue({
                id: 1,
                status: JobStatus.OPEN,
                deadline: new Date('2000-01-01'), // Past deadline
                createdBy: 99
            } as any);

            const res = await request(app)
                .post('/api/v1/recruitment/apply')
                .send(applyPayload);

            expect(res.status).toBe(400);
            expect(res.body.message).toContain('deadline has passed');
        });

        it('should prevent double applications', async () => {
            prismaMock.jobPosting.findUnique.mockResolvedValue({
                id: 1,
                status: JobStatus.OPEN,
                deadline: new Date('2027-12-31'),
                createdBy: 99
            } as any);
            // Return existing application (duplicate check)
            prismaMock.jobApplication.findUnique.mockResolvedValue({ id: 50 } as any);

            const res = await request(app)
                .post('/api/v1/recruitment/apply')
                .send(applyPayload);

            expect(res.status).toBe(400);
            expect(res.body.message).toContain('already applied');
        });

        it('should block HR_OFFICER from applying (conflict of interest)', async () => {
            mockUserRole = 'HR_OFFICER';
            prismaMock.jobPosting.findUnique.mockResolvedValue({
                id: 1, status: JobStatus.OPEN,
                deadline: new Date('2027-12-31'), createdBy: 99
            } as any);

            const res = await request(app)
                .post('/api/v1/recruitment/apply')
                .send(applyPayload);

            expect(res.status).toBe(400);
            expect(res.body.message).toContain('resign');
        });
    });

    // ─── Update Application Status ────────────────────────────────────────────

    describe('PATCH /api/v1/recruitment/applications/:id/status', () => {
        it('should allow HR to update application status to SHORTLISTED', async () => {
            prismaMock.jobApplication.update.mockResolvedValue({
                id: 100,
                status: ApplicationStatus.SHORTLISTED,
                employee: { userId: 5, name: 'John Doe' },
                jobPosting: { title: 'Software Engineer' }
            } as any);

            // Mock notification creation
            prismaMock.notification.create.mockResolvedValue({ id: 99 } as any);

            const res = await request(app)
                .patch('/api/v1/recruitment/applications/100/status')
                .send({ status: 'SHORTLISTED', reviewComment: 'Looks good' });

            if (res.status >= 400) console.dir(res.body, { depth: null });
            expect(res.status).toBe(200);
            expect(res.body.status).toBe('SHORTLISTED');
        });
    });
});
