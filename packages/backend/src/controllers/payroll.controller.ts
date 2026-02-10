
import { Request, Response } from 'express';
import * as payrollService from '../services/payroll.service';
import { UserRole } from '@prisma/client';

import { z } from 'zod';

const payrollParamsSchema = z.object({
    month: z.coerce.number().int().min(1).max(12).optional(),
    year: z.coerce.number().int().min(2000).max(2100).optional()
});

export const getPayrollData = async (req: Request, res: Response) => {
    try {
        const user = req.user;
        if (!user) return res.status(401).json({ message: 'Unauthorized' });

        // Access Control: HR, Finance, Admin
        const allowedRoles: UserRole[] = [UserRole.HR_OFFICER, UserRole.ADMIN, UserRole.FINANCE_OFFICER];
        if (!allowedRoles.includes(user.role)) {
            return res.status(403).json({ message: 'Forbidden: Insufficient permissions' });
        }

        const validation = payrollParamsSchema.safeParse(req.query);
        if (!validation.success) {
            return res.status(400).json({
                message: 'Invalid parameters',
                errors: validation.error.format()
            });
        }

        const { month, year } = validation.data;
        const result = await payrollService.getPayrollData({ month, year });
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};
