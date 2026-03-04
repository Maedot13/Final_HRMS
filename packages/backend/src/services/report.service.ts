
import { prisma } from '../lib/prisma';
import { LeaveStatus, ClearanceStatus, JobStatus } from '@prisma/client';

const campusWhere = (campusId?: number) => campusId != null ? { campusId } : {};

export const getDashboardSummary = async (campusId?: number) => {
    const where = campusWhere(campusId);
    const [
        employeeCount,
        pendingLeaveCount,
        pendingSabbaticalCount,
        activeClearanceCount,
        openJobsCount
    ] = await Promise.all([
        prisma.employee.count({ where }),
        prisma.leaveRequest.count({ where: { status: LeaveStatus.PENDING, ...where } }),
        prisma.sabbaticalRequest.count({ where: { status: LeaveStatus.PENDING, ...where } }),
        prisma.clearanceRequest.count({ where: { status: ClearanceStatus.PENDING, ...where } }),
        prisma.jobPosting.count({ where: { status: JobStatus.OPEN, ...where } })
    ]);

    return {
        employeeCount,
        pendingLeaveCount,
        pendingSabbaticalCount,
        activeClearanceCount,
        openJobsCount
    };
};

export const getLeaveStats = async (campusId?: number) => {
    const where = campusWhere(campusId);
    const stats = await prisma.leaveRequest.groupBy({
        by: ['leaveType', 'status'],
        where: Object.keys(where).length > 0 ? where : undefined,
        _count: {
            id: true
        }
    });

    return stats;
};

export const getDepartmentStats = async (campusId?: number) => {
    const where = campusWhere(campusId);
    const stats = await prisma.employee.groupBy({
        by: ['deptLegacy'],
        where: Object.keys(where).length > 0 ? where : undefined,
        _count: {
            id: true
        }
    });

    return stats;
};

export const getRecruitmentStats = async (campusId?: number) => {
    const where = campusWhere(campusId);
    const stats = await prisma.jobPosting.findMany({
        where: Object.keys(where).length > 0 ? where : undefined,
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
