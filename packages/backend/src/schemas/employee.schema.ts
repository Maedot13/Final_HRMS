
import { z } from 'zod';

export const updateEmployeeSchema = z.object({
    name: z.string().min(2).optional(),
    department: z.string().min(2).optional(),
    position: z.string().min(2).optional(),
    phone: z.string().optional(),
    address: z.string().optional(),
    emergencyContact: z.object({
        name: z.string(),
        relationship: z.string(),
        phone: z.string()
    }).optional()
});
