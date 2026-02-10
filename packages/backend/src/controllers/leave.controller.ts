
import { Request, Response } from 'express';
import * as leaveService from '../services/leave.service';
import { UserRole } from '@hrms/types';
import { z } from 'zod';
import { LeaveType } from '@prisma/client';

const createLeaveSchema = z.object({
    leaveType: z.nativeEnum(LeaveType),
    startDate: z.string().datetime(), // Expect ISO string
    endDate: z.string().datetime(),
    reason: z.string().min(1),
    attachmentUrl: z.string().optional()
});

export const createLeaveRequest = async (req: Request, res: Response) => {
    try {
        const user = req.user;
        if (!user || !user.employeeId) return res.status(401).json({ message: 'Unauthorized' });

        const validation = createLeaveSchema.safeParse(req.body);
        if (!validation.success) {
            return res.status(400).json({ errors: validation.error.format() });
        }

        // Need numeric employee PK, not string ID. 
        // We know we can get it from db, or if we updated token payload to include it.
        // For now, let's assume we fetch it or token has it.
        // Actually token has `userId`. We need `employee.id` (int).
        // Let's rely on service or helper to get employee PK from userId.
        // TODO: ideally token should have employee PK or we fetch context middleware.
        const employee = req.employee;
        if (!employee) return res.status(404).json({ message: 'Employee profile not found' });

        const request = await leaveService.createLeaveRequest(employee.id, validation.data);
        res.status(201).json(request);
    } catch (error: any) {
        res.status(400).json({ message: error.message });
    }
};

export const getMyRequests = async (req: Request, res: Response) => {
    try {
        const user = req.user;
        if (!user) return res.status(401).json({ message: 'Unauthorized' });

        const employee = req.employee;
        if (!employee) return res.status(404).json({ message: 'Employee profile not found' });

        const requests = await leaveService.getEmployeeRequests(employee.id);
        res.json(requests);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const getPendingRequests = async (req: Request, res: Response) => {
    try {
        // Only Dept Head or HR
        // Simple check for now
        const user = req.user;
        if (!user) return res.status(401).json({ message: 'Unauthorized' });

        if (user.role !== UserRole.DEPARTMENT_HEAD && user.role !== UserRole.HR_OFFICER && user.role !== UserRole.ADMIN) {
            return res.status(403).json({ message: 'Forbidden' });
        }

        const requests = await leaveService.getPendingRequests();
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
        if (user.role !== UserRole.DEPARTMENT_HEAD) {
            return res.status(403).json({ message: 'Forbidden' });
        }

        const approver = req.employee;
        if (!approver) return res.status(400).json({ message: 'Approver profile not found' });

        const result = await leaveService.approveRequest(id, approver.id, comment);
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
        if (user.role !== UserRole.DEPARTMENT_HEAD) {
            return res.status(403).json({ message: 'Forbidden: Only Department Head can reject leave requests' });
        }

        const approver = req.employee;
        if (!approver) return res.status(400).json({ message: 'Approver profile not found' });

        const result = await leaveService.rejectRequest(id, approver.id, comment);
        res.json(result);
    } catch (error: any) {
        res.status(400).json({ message: error.message });
    }
};
