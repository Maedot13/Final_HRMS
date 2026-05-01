import { z } from 'zod';

export const LeaveTypeEnum = z.enum([
    'ANNUAL',
    'SICK',
    'MATERNITY',
    'PATERNITY',
    'UNPAID',
    'PERSONAL',
    'STUDY',
    'RESEARCH',
    'SABBATICAL',
]);

export const createLeaveRequestSchema = z
    .object({
        leaveType: LeaveTypeEnum,
        startDate: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
        endDate: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
        reason: z.string().min(5, 'Reason must be at least 5 characters'),
        attachmentUrl: z.string().url().optional(),
    })
    .refine(
        (data) => {
            const start = new Date(data.startDate);
            const end = new Date(data.endDate);
            return end >= start;
        },
        { message: 'End date must be on or after start date' }
    );

export const deptHeadReviewSchema = z.object({
    decision: z.enum(['APPROVED', 'REJECTED']),
    comment: z.string().optional(),
});

export const approveRejectSchema = z.object({
    comment: z.string().optional(),
});
