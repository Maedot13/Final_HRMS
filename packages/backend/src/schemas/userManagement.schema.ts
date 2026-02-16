
import { z } from 'zod';
import { UserRole } from '@prisma/client';
import { passwordSchema } from './auth.schema';

export const updateUserRoleSchema = z.object({
    role: z.nativeEnum(UserRole)
});

export const toggleUserStatusSchema = z.object({
    isActive: z.boolean()
});

export const resetPasswordSchema = z.object({
    password: passwordSchema
});
