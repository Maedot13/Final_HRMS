import { Worker, Job } from 'bullmq';
import Redis from 'ioredis';
import { SystemEventTypes } from '../services/eventBus.service';
import { logger } from '../utils/logger';
import { prisma } from '../lib/prisma';
import { notifyRole, notifyDepartmentHead } from '../services/notification.service';
import { sendEmail } from '../services/email.service';
import { templates } from '../utils/emailTemplates';
import { triggerClearancePayrollTransfer } from '../services/payroll.service';

const connection = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
    maxRetriesPerRequest: null,
});

export const systemWorker = new Worker('SystemEvents', async (job: Job) => {
    logger.info(`[Worker] Processing job ${job.id} of type ${job.name}`);

    switch (job.name) {
        case SystemEventTypes.CLEARANCE_COMPLETED:
            await handleClearanceCompleted(job.data);
            break;
        case SystemEventTypes.CLEARANCE_UNIT_APPROVED:
            await handleClearanceUnitApproved(job.data);
            break;
        case SystemEventTypes.CLEARANCE_UNIT_REJECTED:
            await handleClearanceUnitRejected(job.data);
            break;
        case SystemEventTypes.LEAVE_REQUESTED:
            await handleLeaveRequested(job.data);
            break;
        case SystemEventTypes.LEAVE_APPROVED:
            await handleLeaveApproved(job.data);
            break;
        case SystemEventTypes.LEAVE_REJECTED:
            await handleLeaveRejected(job.data);
            break;
        default:
            logger.warn(`[Worker] Unhandled event type: ${job.name}`);
    }
}, { connection: connection as any });

systemWorker.on('completed', (job: Job) => {
    logger.info(`[Worker] Job ${job.id} completed successfully`);
});

systemWorker.on('failed', (job: Job | undefined, err: Error) => {
    logger.error(`[Worker] Job ${job?.id} failed:`, err);
});

// HANDLERS

async function handleClearanceCompleted(data: any) {
    const { clearanceId, employeeUserId, employeeName, approverId } = data;

    // Trigger Notification: Clearance Completed
    await prisma.notification.create({
        data: {
            userId: employeeUserId,
            type: 'CLEARANCE_COMPLETED',
            title: 'Clearance Process Completed',
            message: 'All departments have approved your clearance. Payroll transfer has been initiated.',
            relatedId: clearanceId,
            relatedType: 'CLEARANCE_REQUEST'
        }
    });

    // Send Email
    const user = await prisma.user.findUnique({ where: { id: employeeUserId } });
    if (user && user.email) {
        await sendEmail({
            to: user.email,
            subject: 'Clearance Process Completed',
            html: templates.clearanceCompleted(employeeName)
        });
    }

    // AUTOMATICALLY CREATE PAYROLL TRANSFER
    try {
        await triggerClearancePayrollTransfer(clearanceId, employeeUserId, approverId);
    } catch (error) {
        // Log the error but don't fail the whole job, as emails/notifications succeeded
        logger.error(`[Worker] Failed payroll transfer for clearance ${clearanceId}`, error);
    }
}

async function handleClearanceUnitApproved(data: any) {
    const { clearanceId, employeeUserId, unitName } = data;

    await prisma.notification.create({
        data: {
            userId: employeeUserId,
            type: 'CLEARANCE_UNIT_APPROVED',
            title: 'Clearance Unit Approved',
            message: `Department "${unitName || 'Unknown'}" has approved your clearance.`,
            relatedId: clearanceId,
            relatedType: 'CLEARANCE_REQUEST'
        }
    });
}

async function handleClearanceUnitRejected(data: any) {
    const { clearanceId, employeeUserId, unitName, comment } = data;

    await prisma.notification.create({
        data: {
            userId: employeeUserId,
            type: 'CLEARANCE_UNIT_REJECTED',
            title: 'Clearance Unit Rejected',
            message: `Department "${unitName || 'Unknown'}" has rejected your clearance. Comment: ${comment}`,
            relatedId: clearanceId,
            relatedType: 'CLEARANCE_REQUEST'
        }
    });
}

async function handleLeaveRequested(data: any) {
    const { requestId, employeeId, employeeName, employeeDepartment, leaveType, days, campusId } = data;

    // Notify Department Head (same campus only - campus isolation)
    await notifyDepartmentHead(employeeDepartment, {
        type: 'LEAVE_REQUEST_CREATED',
        title: 'New Leave Request',
        message: `${employeeName} has requested ${days} days of ${leaveType} leave.`,
        relatedId: requestId,
        relatedType: 'LEAVE_REQUEST',
        campusId
    });
}

async function handleLeaveApproved(data: any) {
    const { requestId, employeeUserId, leaveType, days, comment } = data;

    // Trigger Notification
    await prisma.notification.create({
        data: {
            userId: employeeUserId,
            type: 'LEAVE_APPROVED',
            title: 'Leave Request Approved',
            message: `Your ${leaveType} leave request for ${days} days has been approved.`,
            relatedId: requestId,
            relatedType: 'LEAVE_REQUEST'
        }
    });

    // Send Email
    const user = await prisma.user.findUnique({ where: { id: employeeUserId } });
    if (user && user.email) {
        await sendEmail({
            to: user.email,
            subject: `Leave Request Approved`,
            html: templates.leaveRequestStatusUpdate('Approved', comment || '')
        });
    }
}

async function handleLeaveRejected(data: any) {
    const { requestId, employeeUserId, leaveType, days, comment } = data;

    // Trigger Notification
    await prisma.notification.create({
        data: {
            userId: employeeUserId,
            type: 'LEAVE_REJECTED',
            title: 'Leave Request Rejected',
            message: `Your ${leaveType} leave request for ${days} days has been rejected. Comment: ${comment || 'No comment provided'}`,
            relatedId: requestId,
            relatedType: 'LEAVE_REQUEST'
        }
    });

    // Send Email
    const user = await prisma.user.findUnique({ where: { id: employeeUserId } });
    if (user && user.email) {
        await sendEmail({
            to: user.email,
            subject: `Leave Request Rejected`,
            html: templates.leaveRequestStatusUpdate('Rejected', comment || '')
        });
    }
}
