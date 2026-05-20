
import { z } from 'zod';

export const operationalUpdateSchema = z.object({
    name: z.string().min(2).optional(),
    // departmentId: null = unassign; number = assign
    departmentId: z.union([z.number().int().positive(), z.null()]).optional(),
    position: z.string().optional(),
    hireDate: z.string().datetime({ offset: true }).optional().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()),
    phone: z.string().optional(),
    address: z.string().optional(),
    officeLocation: z.string().optional(),
    contactInfo: z.object({
        phone: z.string().optional(),
        address: z.string().optional(),
        emergencyContact: z.union([
            z.string(),
            z.object({
                name: z.string(),
                relationship: z.string(),
                phone: z.string()
            })
        ]).optional(),
    }).optional(),
    emergencyContact: z.object({
        name: z.string(),
        relationship: z.string(),
        phone: z.string()
    }).optional(),
    employmentStatus: z.enum(['ACTIVE', 'SUSPENDED', 'TRANSFERRED', 'PROBATION', 'TERMINATED', 'RESIGNED']).optional(),
    contractStartDate: z.string().optional(),
    contractEndDate: z.string().optional(),
    employmentType: z.enum(['PERMANENT', 'CONTRACT', 'FULL_TIME', 'PART_TIME']).optional(),
    supervisorId: z.number().int().positive().optional(),
}).strict();

export const financialUpdateSchema = z.object({
    grossSalary: z.number().min(0).optional(),
    salaryType: z.enum(['MONTHLY', 'DAILY', 'HOURLY', 'YEARLY']).optional(),
    payGrade: z.string().optional(),
    taxInformation: z.any().optional(),
});

// A combined schema for admins who can update everything at once
export const updateEmployeeSchema = operationalUpdateSchema.merge(financialUpdateSchema);
