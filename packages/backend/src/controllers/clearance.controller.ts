
import { Request, Response } from 'express';
import * as clearanceService from '../services/clearance.service';
import { UserRole } from '@hrms/types';
import { z } from 'zod';
import { sanitizeInput } from '../utils/sanitize';

const initiateSchema = z.object({
    reason: z.string().min(5, 'Reason must be at least 5 characters'),
    lastWorkingDay: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/))
});

export const initiateClearance = async (req: Request, res: Response) => {
    try {
        const user = req.user;
        if (!user) return res.status(401).json({ message: 'Unauthorized' });

        const validation = initiateSchema.safeParse(req.body);
        if (!validation.success) return res.status(400).json({ errors: validation.error.format() });

        const { getEmployeeByUserId } = await import('../services/employee.service');
        const employee = await getEmployeeByUserId(user.userId);
        if (!employee) return res.status(404).json({ message: 'Employee profile not found' });

        // Parse lastWorkingDay to Date object
        const lastWorkingDay = new Date(validation.data.lastWorkingDay);

        // Sanitize user input
        const sanitizedReason = sanitizeInput(validation.data.reason);

        const result = await clearanceService.initiateClearance(employee.id, sanitizedReason, lastWorkingDay);
        res.status(201).json(result);
    } catch (error: any) {
        res.status(400).json({ message: error.message });
    }
};

export const getClearance = async (req: Request, res: Response) => {
    try {
        const clearanceId = parseInt(req.params.id);
        if (isNaN(clearanceId)) {
            return res.status(400).json({ message: 'Invalid clearance ID' });
        }

        const clearance = await clearanceService.getClearance(clearanceId);

        if (!clearance) {
            return res.status(404).json({ message: 'Clearance request not found' });
        }

        res.json(clearance);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

// Schema for approval
const approveCheckSchema = z.object({
    unitId: z.number(),
    comment: z.string().optional()
});

export const approveCheck = async (req: Request, res: Response) => {
    try {
        const clearanceId = parseInt(req.params.id);
        const user = req.user;
        if (!user) return res.status(401).json({ message: 'Unauthorized' });

        // Validate Body
        const validation = approveCheckSchema.safeParse(req.body);
        if (!validation.success) return res.status(400).json({ errors: validation.error.format() });
        const { unitId, comment } = validation.data;

        // AUTHZ RULE: Is this user authorized to approve for THIS unit?
        // In real app, we might have a mapping table: User <-> ClearanceUnit
        // For now, let's assume ADMIN or Dept Head can approve (Simplified)
        if (![UserRole.ADMIN, UserRole.DEPARTMENT_HEAD, UserRole.HR_OFFICER].includes(user.role)) {
            return res.status(403).json({ message: 'Forbidden' });
        }

        const { getEmployeeByUserId } = await import('../services/employee.service');
        const approver = await getEmployeeByUserId(user.userId);
        if (!approver) return res.status(400).json({ message: 'Approver profile not found' });

        // Sanitize comment if provided
        const sanitizedComment = comment ? sanitizeInput(comment) : undefined;

        const result = await clearanceService.approveCheck(clearanceId, unitId, approver.id, sanitizedComment);
        res.json(result);

    } catch (error: any) {
        res.status(400).json({ message: error.message });
    }
};

export const rejectCheck = async (req: Request, res: Response) => {
    try {
        const clearanceId = parseInt(req.params.id);
        const user = req.user;
        if (!user) return res.status(401).json({ message: 'Unauthorized' });

        // Validate Body
        const validation = approveCheckSchema.safeParse(req.body); // Re-use same schema, comment is required for rejection usually?
        if (!validation.success) return res.status(400).json({ errors: validation.error.format() });
        const { unitId, comment } = validation.data;

        if (!comment) {
            return res.status(400).json({ message: 'Comment is required for rejection' });
        }

        // Authorization (Same as approval)
        if (![UserRole.ADMIN, UserRole.DEPARTMENT_HEAD, UserRole.HR_OFFICER].includes(user.role)) {
            return res.status(403).json({ message: 'Forbidden' });
        }

        const { getEmployeeByUserId } = await import('../services/employee.service');
        const approver = await getEmployeeByUserId(user.userId);
        if (!approver) return res.status(400).json({ message: 'Approver profile not found' });

        // Sanitize comment
        const sanitizedComment = sanitizeInput(comment);

        const result = await clearanceService.rejectCheck(clearanceId, unitId, approver.id, sanitizedComment);
        res.json(result);

    } catch (error: any) {
        res.status(400).json({ message: error.message });
    }
};

// Get pending checks for a specific unit (for approver dashboard)
export const getPendingChecksForUnit = async (req: Request, res: Response) => {
    try {
        const unitId = parseInt(req.params.unitId);
        if (isNaN(unitId)) {
            return res.status(400).json({ message: 'Invalid unit ID' });
        }

        const user = req.user;
        if (!user) return res.status(401).json({ message: 'Unauthorized' });

        // Authorization: Only ADMIN, DEPARTMENT_HEAD, or HR_OFFICER can view pending checks
        if (![UserRole.ADMIN, UserRole.DEPARTMENT_HEAD, UserRole.HR_OFFICER].includes(user.role)) {
            return res.status(403).json({ message: 'Forbidden: Insufficient permissions' });
        }

        const pendingChecks = await clearanceService.getPendingChecksForUnit(unitId);
        res.json(pendingChecks);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};
