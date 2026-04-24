
import { z } from 'zod';

export const initiateClearanceSchema = z.object({
    targetEmployeeId: z.string().min(1, 'Target Employee ID is required'),
    reason: z.string()
        .min(10, 'Reason must be at least 10 characters')
        .max(500, 'Reason cannot exceed 500 characters'),
    lastWorkingDay: z.string()
        .datetime()
        .or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/))
        .refine((date) => {
            const d = new Date(date);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            return d >= today;
        }, 'Last working day must be in the future')
});

export const approveCheckSchema = z.object({
    unitId: z.number().int().positive('Unit ID must be a positive integer'),
    comment: z.string().max(500).optional()
});

export const rejectCheckSchema = z.object({
    unitId: z.number().int().positive('Unit ID must be a positive integer'),
    comment: z.string()
        .min(10, 'Rejection comment must be at least 10 characters')
        .max(500)
});
