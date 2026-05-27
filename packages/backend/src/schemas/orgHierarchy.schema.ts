import { z } from 'zod';

export const createCollegeSchema = z.object({
    name: z.string().min(2).max(100),
    description: z.string().optional(),
    deanEmployeeId: z.string().optional(), // Must be the string employeeId e.g. "BDU00001"
});

export const updateCollegeSchema = z.object({
    name: z.string().min(2).max(100).optional(),
    description: z.string().optional(),
});

export const createFacultySchema = z.object({
    collegeId: z.number().int().positive(),
    name: z.string().min(2).max(100),
    description: z.string().optional(),
    deanEmployeeId: z.string().optional(),
});

export const updateFacultySchema = z.object({
    name: z.string().min(2).max(100).optional(),
    description: z.string().optional(),
});

export const assignDeanSchema = z.object({
    employeeId: z.string().optional().nullable(),
});
