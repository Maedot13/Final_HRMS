
import { z } from 'zod';
import { JobStatus, ApplicationStatus } from '@prisma/client';

export const createJobPostingSchema = z.object({
    title: z.string().min(3).max(100),
    description: z.string().min(10),
    requirements: z.string().min(10),
    department: z.string().min(2),
    position: z.string().min(2),
    deadline: z.string().refine((val) => !isNaN(Date.parse(val)), {
        message: "Invalid date format for deadline"
    })
});

export const updateJobStatusSchema = z.object({
    status: z.nativeEnum(JobStatus)
});

export const applyForJobSchema = z.object({
    jobPostingId: z.number().int().positive(),
    coverLetter: z.string().min(20),
    cvUrl: z.string().url()
});

export const updateApplicationStatusSchema = z.object({
    status: z.nativeEnum(ApplicationStatus),
    reviewComment: z.string().optional()
});
