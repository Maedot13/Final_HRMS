import { z } from 'zod';

export const createSabbaticalSchema = z.object({
    startDate: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
    endDate: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
    reason: z.string().min(10, 'Reason must be at least 10 characters'),
}).refine((data) => {
    const start = new Date(data.startDate);
    const end = new Date(data.endDate);
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    // End date must be strictly after start date
    if (end <= start) return false;

    // Start date must not be in the past
    if (start < now) return false;

    // Calculate duration in months (approximate)
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffMonths = diffTime / (1000 * 60 * 60 * 24 * 30);

    // Max 12 months
    if (diffMonths > 12) return false;

    return true;
}, {
    message: 'Invalid date range: end date must be after start date, start date must not be in the past, and duration must not exceed 12 months'
});

export const approveSabbaticalSchema = z.object({
    comment: z.string().optional()
});
