
import { Request, Response } from 'express';
import * as sabbaticalService from '../services/sabbatical.service';
import { UserRole } from '@hrms/types';
import { z } from 'zod';

const createSabbaticalSchema = z.object({
    purpose: z.string().min(10),
    startDate: z.string().datetime(),
    endDate: z.string().datetime(),
    plan: z.string().min(20),
    planDocumentUrl: z.string().url().optional()
});

export const createSabbatical = async (req: Request, res: Response) => {
    try {
        const user = req.user;
        if (!user) return res.status(401).json({ message: 'Unauthorized' });

        const validation = createSabbaticalSchema.safeParse(req.body);
        if (!validation.success) {
            return res.status(400).json({ errors: validation.error.format() });
        }

        const employee = req.employee;
        if (!employee) return res.status(404).json({ message: 'Employee profile not found' });

        const request = await sabbaticalService.createSabbaticalRequest(employee.id, validation.data);
        res.status(201).json(request);
    } catch (error: any) {
        res.status(400).json({ message: error.message });
    }
};

export const getRequests = async (req: Request, res: Response) => {
    try {
        const user = req.user;
        if (!user) return res.status(401).json({ message: 'Unauthorized' });

        const employee = req.employee;
        if (!employee) return res.status(404).json({ message: 'Employee profile not found' });

        // If employee, see own. If HR/Admin/Head, see all (or filtered, simplified to all for now)
        const isPrivileged = [UserRole.ADMIN, UserRole.HR_OFFICER, UserRole.DEPARTMENT_HEAD].includes(user.role);

        const requests = await sabbaticalService.getSabbaticalRequests(isPrivileged ? undefined : employee.id);
        res.json(requests);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const approveRequest = async (req: Request, res: Response) => {
    try {
        const id = parseInt(req.params.id);
        const { comment } = req.body;
        const user = req.user;

        if (!user) return res.status(401).json({ message: 'Unauthorized' });

        // Only Dept Head or HR or Admin can approve
        if (![UserRole.DEPARTMENT_HEAD, UserRole.HR_OFFICER, UserRole.ADMIN].includes(user.role)) {
            return res.status(403).json({ message: 'Forbidden' });
        }

        const approver = req.employee;
        if (!approver) return res.status(400).json({ message: 'Approver profile not found' });

        const result = await sabbaticalService.approveSabbatical(id, approver.id, comment);
        res.json(result);
    } catch (error: any) {
        res.status(400).json({ message: error.message });
    }
};

export const rejectRequest = async (req: Request, res: Response) => {
    try {
        const id = parseInt(req.params.id);
        const { comment } = req.body;
        const user = req.user;
        if (!user) return res.status(401).json({ message: 'Unauthorized' });

        if (!comment || comment.trim().length < 5) {
            return res.status(400).json({ message: 'Rejection requires a comment (min 5 characters)' });
        }

        if (![UserRole.DEPARTMENT_HEAD, UserRole.HR_OFFICER, UserRole.ADMIN].includes(user.role)) {
            return res.status(403).json({ message: 'Forbidden' });
        }

        const approver = req.employee;
        if (!approver) return res.status(400).json({ message: 'Approver profile not found' });

        const result = await sabbaticalService.rejectSabbatical(id, approver.id, comment);
        res.json(result);
    } catch (error: any) {
        res.status(400).json({ message: error.message });
    }
};
