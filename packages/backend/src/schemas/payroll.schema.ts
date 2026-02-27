
import { z } from 'zod';

export const payrollDataTransferSchema = z.object({
    query: z.object({
        month: z.string().regex(/^(0?[1-9]|1[0-2])$/, 'Month must be between 1 and 12'),
        year: z.string().regex(/^\d{4}$/, 'Year must be a 4-digit number')
    })
});
