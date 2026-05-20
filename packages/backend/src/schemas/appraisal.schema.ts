
import { z } from 'zod';

export const appraisalSchema = z.object({
    employeeId: z.number().int().positive(),
    period: z.string().min(1, "Period is required"),
    qualityScore: z.number().min(0).max(100),
    punctualityScore: z.number().min(0).max(100),
    knowledgeScore: z.number().min(0).max(100),
    teamworkScore: z.number().min(0).max(100),
    efficiencyScore: z.number().min(0).max(100), // Aggregate
    workOutputScore: z.number().min(0).max(100),
    comments: z.string().optional(),
});

export const updateAppraisalSchema = appraisalSchema.partial().omit({ employeeId: true });

export type AppraisalInput = z.infer<typeof appraisalSchema>;
export type UpdateAppraisalInput = z.infer<typeof updateAppraisalSchema>;
