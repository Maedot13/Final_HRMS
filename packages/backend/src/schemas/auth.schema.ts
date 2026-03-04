import { z } from 'zod';
import { UserRole } from '@hrms/types';

export const loginSchema = z.object({
    employeeId: z.string().min(1, 'Employee ID is required'),
    password: z.string().min(1, 'Password is required')
});

export const passwordSchema = z.string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password must not exceed 128 characters')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^a-zA-Z0-9]/, 'Password must contain at least one special character');

export const registerSchema = z.object({
    email: z.string().email('Invalid email address'),
    password: passwordSchema.optional(),
    name: z.string().min(2, 'Name must be at least 2 characters'),
    employeeId: z.string().optional(),
    department: z.string().min(1, 'Department name is required').optional(),
    departmentId: z.number().int().positive().optional(),
    role: z.nativeEnum(UserRole).optional(),
    campusId: z.number().int().positive().optional()
});

export const refreshTokenSchema = z.object({
    refreshToken: z.string().min(1, 'Refresh token is required')
});

export const changePasswordSchema = z.object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: passwordSchema
});
