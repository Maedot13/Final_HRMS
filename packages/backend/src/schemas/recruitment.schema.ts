
import { z } from 'zod';
import { JobStatus, ApplicationStatus } from '@prisma/client';

export const createJobPostingSchema = z.object({
    title: z.string().min(3).max(100),
    description: z.string().min(10),
    requirements: z.string().min(10),
    departmentId: z.number().int().positive(),
    position: z.string().min(2),
    deadline: z.string().refine((val) => {
        const date = new Date(val);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return !isNaN(date.getTime()) && date >= today;
    }, {
        message: "Deadline must be today or in the future"
    }),
    vacancies: z.number().int().min(1).optional().default(1)
});

export const updateJobPostingSchema = createJobPostingSchema.partial();


export const updateJobStatusSchema = z.object({
    status: z.nativeEnum(JobStatus)
});

export const applyForJobSchema = z.object({
    jobPostingId: z.number().int().positive(),
    reasonForApplying: z.string().min(20),
    cvUrl: z.string().url()
});

export const updateApplicationStatusSchema = z.object({
    status: z.nativeEnum(ApplicationStatus),
    reviewComment: z.string().optional()
});

export const evaluateApplicationSchema = z.object({
    examScore: z.number().min(0).max(100).optional(),
    interviewScore: z.number().min(0).max(100).optional(),
    recommendation: z.string().min(5),
    status: z.nativeEnum(ApplicationStatus)
});
