
import { prisma } from '../lib/prisma';
import { LeaveStatus, LeaveType, ClearanceStatus, JobStatus } from '@prisma/client';

export const getDashboardSummary = async () => {
    const [
        employeeCount,
        pendingLeaveCount,
        pendingSabbaticalCount,
        activeClearanceCount,
        openJobsCount
    ] = await Promise.all([
        prisma.employee.count(),
        prisma.leaveRequest.count({ where: { status: LeaveStatus.PENDING } }),
        prisma.sabbaticalRequest.count({ where: { status: LeaveStatus.PENDING } }),
        prisma.clearanceRequest.count({ where: { status: ClearanceStatus.PENDING } }),
        prisma.jobPosting.count({ where: { status: JobStatus.OPEN } })
    ]);

    return {
        employeeCount,
        pendingLeaveCount,
        pendingSabbaticalCount,
        activeClearanceCount,
        openJobsCount
    };
};

export const getLeaveStats = async () => {
    const stats = await prisma.leaveRequest.groupBy({
        by: ['leaveType', 'status'],
        _count: {
            id: true
        }
    });

    return stats;
};

export const getDepartmentStats = async () => {
    const stats = await prisma.employee.groupBy({
        by: ['department'],
        _count: {
            id: true
        }
    });

    return stats;
};

export const getRecruitmentStats = async () => {
    const stats = await prisma.jobPosting.findMany({
        include: {
            _count: {
                select: { applications: true }
            }
        }
    });

    return stats.map(job => ({
        id: job.id,
        title: job.title,
        status: job.status,
        applicationsCount: job._count.applications
    }));
};
