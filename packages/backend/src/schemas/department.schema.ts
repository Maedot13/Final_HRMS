import { z } from 'zod';

export const createDepartmentSchema = z.object({
    name: z.string().min(2).max(100),
    headEmployeeId: z.string().optional(),
    facultyId: z.number().int().positive().optional(),
});

export const updateDepartmentSchema = z.object({
    name: z.string().min(2).max(100).optional(),
    facultyId: z.number().int().positive().optional(),
});
