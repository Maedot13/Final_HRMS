
import { z } from 'zod';
import { UserRole } from '@prisma/client';
import { passwordSchema } from './auth.schema';

export const updateUserRoleSchema = z.object({
    role: z.union([z.nativeEnum(UserRole), z.literal('HEAD_HR')]),
    /** ID of an existing Faculty to associate with a Recruitment Committee member */
    facultyId: z.number().int().positive().optional(),
    /** Name of a new Faculty to create and associate (used when no facultyId is given) */
    newFacultyName: z.string().min(1).max(200).trim().optional(),
});

export const toggleUserStatusSchema = z.object({
    isActive: z.boolean()
});

export const resetPasswordSchema = z.object({
    password: passwordSchema
});
