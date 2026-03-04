import { z } from 'zod';

export const createCampusSchema = z.object({
    code: z.string().min(2).max(20).regex(/^[A-Z0-9_-]+$/i, 'Code must only contain letters, numbers, hyphens, or underscores'),
    name: z.string().min(3).max(100),
    description: z.string().max(500).optional(),
    timezone: z.string().optional(),
    employeeIdPrefix: z.string().min(1).max(10).regex(/^[A-Z]+$/, 'Prefix must consist of only uppercase letters'),
    employeeNumericLength: z.number().min(3, 'Length must be at least 3').max(6, 'Length cannot exceed 6'),
    initialAdmin: z.object({
        employeeId: z.string().min(3).max(50),
        email: z.string().email(),
        name: z.string().min(2).max(100),
        password: z.string().min(8).optional(),
    }),
});

export const updateCampusSchema = z.object({
    name: z.string().min(3).max(100).optional(),
    description: z.string().max(500).nullable().optional(),
    isActive: z.boolean().optional(),
    timezone: z.string().optional(),
    employeeIdPrefix: z.string().min(1).max(10).regex(/^[A-Z]+$/, 'Prefix must consist of only uppercase letters').optional(),
    employeeNumericLength: z.number().min(3).max(6).optional(),
});

export type CreateCampusInput = z.infer<typeof createCampusSchema>;
export type UpdateCampusInput = z.infer<typeof updateCampusSchema>;
