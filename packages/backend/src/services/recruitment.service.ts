
import { JobStatus, ApplicationStatus } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { createNotification } from './notification.service';
import { sendEmail } from './email.service';
import { templates } from '../utils/emailTemplates';

export const createJobPosting = async (data: {
    title: string;
    description: string;
    requirements: string;
    departmentId: number;
    position: string;
    deadline: string;
    vacancies?: number;
    createdBy: number;
}) => {
    const creator = await prisma.user.findUnique({
        where: { id: data.createdBy },
        select: { campusId: true }
    });
    const campusId = creator?.campusId ?? null;

    return prisma.jobPosting.create({
        data: {
            title: data.title,
            description: data.description,
            requirements: data.requirements,
            departmentId: data.departmentId,
            position: data.position,
            createdBy: data.createdBy,
            campusId,
            deadline: new Date(data.deadline),
            status: JobStatus.OPEN,
            vacancies: data.vacancies ?? 1
        }
    });
};

export const updateJobPosting = async (id: number, data: Partial<{
    title: string;
    description: string;
    requirements: string;
    departmentId: number;
    position: string;
    deadline: string;
    vacancies: number;
}>, campusId?: number) => {
    // First verify the job exists and is accessible
    const job = await prisma.jobPosting.findFirst({
        where: { id, ...(campusId ? { campusId } : {}) }
    });
    
    if (!job) {
        throw new Error('Job posting not found or access denied');
    }

    return prisma.jobPosting.update({
        where: { id },
        data: {
            ...(data.title && { title: data.title }),
            ...(data.description && { description: data.description }),
            ...(data.requirements && { requirements: data.requirements }),
            ...(data.departmentId && { departmentId: data.departmentId }),
            ...(data.position && { position: data.position }),
            ...(data.deadline && { deadline: new Date(data.deadline) }),
            ...(data.vacancies !== undefined && { vacancies: data.vacancies }),
        }
    });
};

export const getJobPostings = async (filters: { status?: JobStatus; departmentId?: number; facultyId?: number }, campusId?: number) => {
    return prisma.jobPosting.findMany({
        where: {
            ...(campusId ? {
                OR: [
                    { campusId },
                    { campusId: null }
                ]
            } : {}),
            ...(filters.status && { status: filters.status }),
            ...(filters.departmentId && { departmentId: filters.departmentId }),
            ...(filters.facultyId ? {
                applications: {
                    some: {
                        assignedFacultyId: filters.facultyId
                    }
                }
            } : {})
        },
        include: {
            _count: {
                select: { 
                    applications: {
                        where: { status: ApplicationStatus.HIRED }
                    }
                }
            }
        },
        orderBy: { createdAt: 'desc' }
    });
};

export const getJobPostingById = async (id: number, campusId?: number) => {
    return prisma.jobPosting.findFirst({
        where: {
            id,
            ...(campusId ? {
                OR: [
                    { campusId },
                    { campusId: null }
                ]
            } : {})
        },
        include: {
            _count: {
                select: { applications: true }
            }
        }
    });
};

export const updateJobStatus = async (id: number, status: JobStatus, campusId?: number) => {
    const updated = await prisma.jobPosting.updateMany({
        where: {
            id,
            ...(campusId ? {
                OR: [
                    { campusId },
                    { campusId: null }
                ]
            } : {})
        },
        data: { status }
    });
    if (updated.count === 0) {
        throw new Error('Job posting not found');
    }
    return prisma.jobPosting.findFirst({ where: { id, ...(campusId ? { campusId } : {}) } });
};

export const applyForJob = async (employeeId: number, userId: number, userRole: string, data: {
    jobPostingId: number;
    reasonForApplying: string;
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

    // Fetch user and employee for checks and email
    const applicantUser = await prisma.user.findUnique({ where: { id: userId }, include: { employee: true } });
    if (!applicantUser || !applicantUser.employee) throw new Error('Applicant not found');


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

    const appliedJob = await prisma.jobPosting.findUnique({ where: { id: data.jobPostingId } });

    if (applicantUser.email && appliedJob) {
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
            status: ApplicationStatus.PENDING
        }
    });
};

export const getApplicationsForJob = async (jobPostingId: number, facultyId?: number) => {
    return prisma.jobApplication.findMany({
        where: {
            jobPostingId,
            // If facultyId provided (committee role), only show apps assigned to them
            ...(facultyId !== undefined ? { assignedFacultyId: facultyId } : {})
        },
        include: {
            employee: {
                select: {
                    name: true,
                    employeeId: true,
                    position: true,
                    department: { select: { name: true } }
                }
            }
        },
        orderBy: { createdAt: 'desc' }
    });
};

export const updateApplicationStatus = async (
    applicationId: number,
    data: { status: ApplicationStatus; reviewedBy: number; reviewComment?: string; assignedFacultyId?: number }
) => {
    const application = await prisma.jobApplication.findUnique({
        where: { id: applicationId }
    });

    if (!application) throw new Error('Application not found');

    // Flow enforcement for HR
    if (data.status === ApplicationStatus.RECOMMENDED || data.status === ApplicationStatus.NOT_SELECTED || data.status === ApplicationStatus.EVALUATED) {
        throw new Error('Only the recruitment committee can evaluate and recommend candidates');
    }

    if (data.status === ApplicationStatus.ACCEPTED || data.status === ApplicationStatus.REJECTED) {
        if (application.status !== ApplicationStatus.PENDING) {
            throw new Error('Can only accept or reject PENDING applications');
        }
    }

    if (data.status === ApplicationStatus.HIRED && application.status !== ApplicationStatus.RECOMMENDED) {
        throw new Error('Can only hire applicants who have been recommended by the committee');
    }

    const updatedApplication = await prisma.jobApplication.update({
        where: { id: applicationId },
        data: {
            status: data.status,
            reviewedBy: data.reviewedBy,
            reviewComment: data.reviewComment,
            ...(data.assignedFacultyId ? { assignedFacultyId: data.assignedFacultyId } : {}),
            updatedAt: new Date()
        },
        include: {
            jobPosting: true,
            employee: true
        }
    });

    if (data.status === ApplicationStatus.HIRED) {
        // Count total hired for this job
        const hiredCount = await prisma.jobApplication.count({
            where: {
                jobPostingId: updatedApplication.jobPostingId,
                status: ApplicationStatus.HIRED
            }
        });

        const job = await prisma.jobPosting.findUnique({
            where: { id: updatedApplication.jobPostingId }
        });

        if (job && hiredCount >= job.vacancies) {
            await prisma.jobPosting.update({
                where: { id: updatedApplication.jobPostingId },
                data: { status: JobStatus.CLOSED }
            });
        }
    }

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

export const evaluateApplication = async (
    applicationId: number,
    data: {
        examScore?: number;
        interviewScore?: number;
        recommendation: string;
        status: ApplicationStatus;
        reviewedBy: number;
    }
) => {
    const application = await prisma.jobApplication.findUnique({
        where: { id: applicationId },
        include: { jobPosting: true, employee: true }
    });

    if (!application) throw new Error('Application not found');
    
    // Only accepted applications can be evaluated
    if (application.status !== ApplicationStatus.ACCEPTED && application.status !== ApplicationStatus.EVALUATED) {
        throw new Error('Only accepted applications can be evaluated by the committee');
    }

    // Committee can only use specific evaluation statuses
    if (data.status !== ApplicationStatus.RECOMMENDED && data.status !== ApplicationStatus.NOT_SELECTED && data.status !== ApplicationStatus.EVALUATED) {
        throw new Error('Committee can only set status to RECOMMENDED, NOT_SELECTED, or EVALUATED');
    }

    const updated = await prisma.jobApplication.update({
        where: { id: applicationId },
        data: {
            examScore: data.examScore,
            interviewScore: data.interviewScore,
            recommendation: data.recommendation,
            status: data.status,
            reviewedBy: data.reviewedBy,
            updatedAt: new Date()
        },
        include: { jobPosting: true, employee: true }
    });

    // Notify the applicant
    await createNotification({
        userId: updated.employee.userId,
        type: 'APPLICATION_STATUS_UPDATE',
        title: `Evaluation Update: ${updated.jobPosting.title}`,
        message: `The recruitment committee has updated your evaluation. Status: ${data.status}`,
        relatedId: updated.id,
        relatedType: 'JOB_APPLICATION'
    });

    return updated;
};

export const getEmployeeApplications = async (employeeId: number) => {
    return prisma.jobApplication.findMany({
        where: { employeeId },
        include: {
            jobPosting: {
                select: {
                    title: true,
                    department: { select: { name: true } },
                    position: true,
                    status: true
                }
            }
        },
        orderBy: { createdAt: 'desc' }
    });
};
