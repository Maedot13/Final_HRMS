
import { z } from 'zod';
import { ClearanceStatus } from '@prisma/client';

export const initiateClearanceSchema = z.object({
    reason: z.string().min(10, 'Reason must be at least 10 characters long'),
    lastWorkingDay: z.string().datetime(),
});

export const approveCheckSchema = z.object({
    comment: z.string().optional()
});

export const rejectCheckSchema = z.object({
    comment: z.string().min(5, 'Rejection reason is required')
});
