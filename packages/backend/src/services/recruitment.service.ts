
import { JobStatus, ApplicationStatus } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { createNotification } from './notification.service';
import { sendEmail } from './email.service';
import { templates } from '../utils/emailTemplates';

export const createJobPosting = async (data: {
    title: string;
    description: string;
    requirements: string;
    department: string;
    position: string;
    deadline: string;
    createdBy: number;
}) => {
    const creator = await prisma.user.findUnique({
        where: { id: data.createdBy },
        select: { campusId: true }
    });
    const campusId = creator?.campusId ?? null;

    return prisma.jobPosting.create({
        data: {
            ...data,
            campusId,
            deadline: new Date(data.deadline),
            status: JobStatus.OPEN
        }
    });
};

export const getJobPostings = async (filters: { status?: JobStatus; department?: string }, campusId?: number) => {
    return prisma.jobPosting.findMany({
        where: {
            ...(campusId ? { campusId } : {}),
            ...(filters.status && { status: filters.status }),
            ...(filters.department && { department: filters.department })
        },
        orderBy: { createdAt: 'desc' }
    });
};

export const getJobPostingById = async (id: number, campusId?: number) => {
    return prisma.jobPosting.findFirst({
        where: { id, ...(campusId ? { campusId } : {}) },
        include: {
            _count: {
                select: { applications: true }
            }
        }
    });
};

export const updateJobStatus = async (id: number, status: JobStatus, campusId?: number) => {
    const updated = await prisma.jobPosting.updateMany({
        where: { id, ...(campusId ? { campusId } : {}) },
        data: { status }
    });
    if (updated.count === 0) {
        throw new Error('Job posting not found');
    }
    return prisma.jobPosting.findFirst({ where: { id, ...(campusId ? { campusId } : {}) } });
};

export const applyForJob = async (employeeId: number, userId: number, userRole: string, data: {
    jobPostingId: number;
    coverLetter: string;
    cvUrl: string;
}) => {
    const job = await prisma.jobPosting.findUnique({ where: { id: data.jobPostingId } });
    if (!job) throw new Error('Job posting not found');

    // CONFLICT OF INTEREST CHECKS
    if (userRole === 'HR_OFFICER' || userRole === 'RECRUITMENT_COMMITTEE') {
        throw new Error('Committee members must resign from their role before applying for a position');
    }

    if (job.createdBy === userId) {
        throw new Error('Creators cannot apply for their own job postings');
    }

    if (job.status !== JobStatus.OPEN) throw new Error('Job posting is no longer open');
    if (new Date() > job.deadline) throw new Error('Application deadline has passed');

    // Check for duplicate application
    const existing = await prisma.jobApplication.findUnique({
        where: {
            jobPostingId_employeeId: {
                jobPostingId: data.jobPostingId,
                employeeId
            }
        }
    });
    if (existing) throw new Error('You have already applied for this position');

    // Fetch user email to send confirmation
    const applicantUser = await prisma.user.findUnique({ where: { id: userId }, include: { employee: true } });
    const appliedJob = await prisma.jobPosting.findUnique({ where: { id: data.jobPostingId } });

    if (applicantUser && applicantUser.email && appliedJob && applicantUser.employee) {
        await sendEmail({
            to: applicantUser.email,
            subject: `Application Received: ${appliedJob.title}`,
            html: templates.recruitmentApplicationReceived(applicantUser.employee.name, appliedJob.title)
        });
    }

    return prisma.jobApplication.create({
        data: {
            ...data,
            employeeId,
            status: ApplicationStatus.SUBMITTED
        }
    });
};

export const getApplicationsForJob = async (jobPostingId: number) => {
    return prisma.jobApplication.findMany({
        where: { jobPostingId },
        include: {
            employee: {
                select: {
                    name: true,
                    employeeId: true,
                    position: true,
                    department: true
                }
            }
        },
        orderBy: { createdAt: 'desc' }
    });
};

export const updateApplicationStatus = async (
    applicationId: number,
    data: { status: ApplicationStatus; reviewedBy: number; reviewComment?: string }
) => {
    // Let me rewrite the whole function block safely
    const updatedApplication = await prisma.jobApplication.update({
        where: { id: applicationId },
        data: {
            status: data.status,
            reviewedBy: data.reviewedBy,
            reviewComment: data.reviewComment,
            updatedAt: new Date()
        },
        include: {
            jobPosting: true,
            employee: true
        }
    });

    // NOTIFICATION: Notify the applicant
    await createNotification({
        userId: updatedApplication.employee.userId,
        type: 'APPLICATION_STATUS_UPDATE',
        title: `Application Update: ${updatedApplication.jobPosting.title}`,
        message: `Your application status has been updated to ${data.status}. ${data.reviewComment ? `Comment: ${data.reviewComment}` : ''}`,
        relatedId: updatedApplication.id,
        relatedType: 'JOB_APPLICATION'
    });

    return updatedApplication;
};

export const getEmployeeApplications = async (employeeId: number) => {
    return prisma.jobApplication.findMany({
        where: { employeeId },
        include: {
            jobPosting: {
                select: {
                    title: true,
                    department: true,
                    position: true,
                    status: true
                }
            }
        },
        orderBy: { createdAt: 'desc' }
    });
};
