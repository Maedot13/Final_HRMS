import { eventBus, AppEvents } from '../utils/eventBus';
import { createNotification, notifyDepartmentHead } from '../services/notification.service';
import { sendEmail } from '../services/email.service';
import { templates } from '../utils/emailTemplates';
import { prisma } from '../lib/prisma';
import { logger } from '../utils/logger';

// Interface for event payloads
interface LeaveRequestPayload {
    id: number;
    employeeId: number;
    leaveType: string;
    days: number;
    reason: string;
    startDate: Date;
    endDate: Date;
    status: string;
    employee: {
        id: number;
        userId: number;
        name: string;
        department: string;
        email?: string; // If available on employee directly
    };
}

export const registerLeavehandlers = () => {
    logger.info('Registering leave event handlers');

    eventBus.on(AppEvents.LEAVE_REQUEST_CREATED, async (payload: LeaveRequestPayload) => {
        try {
            logger.info(`Processing LEAVE_REQUEST_CREATED for request ${payload.id}`);
            // Notify Department Head
            await notifyDepartmentHead(payload.employee.department, {
                type: 'LEAVE_REQUEST_CREATED',
                title: 'New Leave Request',
                message: `${payload.employee.name} has requested ${payload.days} days of ${payload.leaveType} leave.`,
                relatedId: payload.id,
                relatedType: 'LEAVE_REQUEST'
            });
        } catch (error) {
            logger.error(`Error handling LEAVE_REQUEST_CREATED: ${error}`);
        }
    });

    eventBus.on(AppEvents.LEAVE_REQUEST_APPROVED, async (payload: { requestId: number, comment?: string }) => {
        try {
            logger.info(`Processing LEAVE_REQUEST_APPROVED for request ${payload.requestId}`);
            const request = await prisma.leaveRequest.findUnique({
                where: { id: payload.requestId },
                include: { employee: true }
            });

            if (!request) return;

            // Trigger Notification
            await createNotification({
                userId: request.employee.userId,
                type: 'LEAVE_APPROVED',
                title: 'Leave Request Approved',
                message: `Your ${request.leaveType} leave request for ${request.days} days has been approved.`,
                relatedId: request.id,
                relatedType: 'LEAVE_REQUEST'
            });

            // Send Email
            const user = await prisma.user.findUnique({ where: { id: request.employee.userId } });
            if (user && user.email) {
                await sendEmail({
                    to: user.email,
                    subject: `Leave Request Approved`,
                    html: templates.leaveRequestStatusUpdate('Approved', payload.comment || '')
                });
            }
        } catch (error) {
            logger.error(`Error handling LEAVE_REQUEST_APPROVED: ${error}`);
        }
    });

    eventBus.on(AppEvents.LEAVE_REQUEST_REJECTED, async (payload: { requestId: number, comment?: string }) => {
        try {
            logger.info(`Processing LEAVE_REQUEST_REJECTED for request ${payload.requestId}`);
            const request = await prisma.leaveRequest.findUnique({
                where: { id: payload.requestId },
                include: { employee: true }
            });

            if (!request) return;

            // Trigger Notification
            await createNotification({
                userId: request.employee.userId,
                type: 'LEAVE_REJECTED',
                title: 'Leave Request Rejected',
                message: `Your ${request.leaveType} leave request for ${request.days} days has been rejected. Comment: ${payload.comment || 'No comment provided'}`,
                relatedId: request.id,
                relatedType: 'LEAVE_REQUEST'
            });

            // Send Email
            const user = await prisma.user.findUnique({ where: { id: request.employee.userId } });
            if (user && user.email) {
                await sendEmail({
                    to: user.email,
                    subject: `Leave Request Rejected`,
                    html: templates.leaveRequestStatusUpdate('Rejected', payload.comment || '')
                });
            }
        } catch (error) {
            logger.error(`Error handling LEAVE_REQUEST_REJECTED: ${error}`);
        }
    });
};
