import { z } from 'zod';

export const createDepartmentSchema = z.object({
    name: z.string().min(2).max(100),
    headEmployeeId: z.string().optional(),
});

export const updateDepartmentSchema = z.object({
    name: z.string().min(2).max(100).optional(),
});
