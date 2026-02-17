
import { Request, Response, NextFunction } from 'express';
import { Employee } from '@prisma/client';
import { prisma } from '../lib/prisma';


declare global {
    // eslint-disable-next-line @typescript-eslint/no-namespace
    namespace Express {
        interface Request {
            employee?: Employee;
        }
    }
}

import { sendError, ErrorCode } from '../utils/errorHandler';

export const attachEmployee = async (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
        return sendError(res, 401, ErrorCode.UNAUTHORIZED, 'Authentication required', null, req);
    }

    try {
        const employee = await prisma.employee.findUnique({
            where: { userId: req.user.userId }
        });

        if (!employee) {
            return sendError(res, 404, ErrorCode.NOT_FOUND, 'Employee profile not found', null, req);
        }

        req.employee = employee;
        next();
    } catch (error: any) {
        sendError(res, 500, ErrorCode.INTERNAL_ERROR, 'Error fetching employee profile', error.message, req);
    }
};
