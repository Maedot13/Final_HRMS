
import { Request, Response, NextFunction } from 'express';
import { PrismaClient, Employee } from '@prisma/client';

const prisma = new PrismaClient();

declare global {
    namespace Express {
        interface Request {
            employee?: Employee;
        }
    }
}

export const attachEmployee = async (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
        return res.status(401).json({ message: 'Authentication required' });
    }

    try {
        const employee = await prisma.employee.findUnique({
            where: { userId: req.user.userId }
        });

        if (!employee) {
            return res.status(404).json({ message: 'Employee profile not found' });
        }

        req.employee = employee;
        next();
    } catch (error: any) {
        res.status(500).json({ message: 'Error fetching employee profile', error: error.message });
    }
};
