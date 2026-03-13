
import { z } from 'zod';

export const operationalUpdateSchema = z.object({
    name: z.string().min(2).optional(),
    departmentId: z.number().int().positive().optional(),
    position: z.string().min(2).optional(),
    phone: z.string().optional(),
    address: z.string().optional(),
    officeLocation: z.string().optional(),
    emergencyContact: z.object({
        name: z.string(),
        relationship: z.string(),
        phone: z.string()
    }).optional(),
    employmentStatus: z.enum(['ACTIVE', 'SUSPENDED', 'TRANSFERRED']).optional(),
    contractStartDate: z.string().datetime().optional(),
    contractEndDate: z.string().datetime().optional(),
    employmentType: z.enum(['PERMANENT', 'CONTRACT']).optional(),
    supervisorId: z.number().int().positive().optional(),
}).strict();

export const financialUpdateSchema = z.object({
    grossSalary: z.number().min(0).optional(),
    salaryType: z.enum(['MONTHLY', 'DAILY']).optional(),
    payGrade: z.string().optional(),
    taxInformation: z.any().optional(),
});

// A combined schema for admins who can update everything at once
export const updateEmployeeSchema = operationalUpdateSchema.merge(financialUpdateSchema);
