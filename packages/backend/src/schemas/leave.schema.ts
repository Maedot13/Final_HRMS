import { z } from 'zod';
import { LeaveType } from '@hrms/types';

export const createLeaveRequestSchema = z.object({
    leaveType: z.nativeEnum(LeaveType),
    startDate: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
    endDate: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
    reason: z.string().min(5, 'Reason must be at least 5 characters'),
    attachmentUrl: z.string().url().optional()
}).refine((data) => {
    const start = new Date(data.startDate);
    const end = new Date(data.endDate);
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    // End date must be >= start date
    if (end < start) return false;

    // Start date must not be in the past
    if (start < now) return false;

    return true;
}, {
    message: 'Invalid date range: end date must be after start date, and start date must not be in the past'
});

export const approveRejectSchema = z.object({
    comment: z.string().optional()
});
