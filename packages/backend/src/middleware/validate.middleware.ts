
import { Request, Response, NextFunction } from 'express';
import { ZodTypeAny, ZodError } from 'zod';
import { sendError, ErrorCode } from '../utils/errorHandler';

export const validate = (schema: ZodTypeAny) => async (req: Request, res: Response, next: NextFunction) => {
    try {
        await schema.parseAsync({
            body: req.body,
            query: req.query,
            params: req.params,
        });
        return next();
    } catch (error) {
        if (error instanceof ZodError) {
            return sendError(
                res,
                400,
                ErrorCode.VALIDATION_ERROR,
                'Validation failed',
                error.format(),
                req
            );
        }
        return next(error);
    }
};

// Simplified validator that checks only body (common case)
export const validateBody = (schema: ZodTypeAny) => async (req: Request, res: Response, next: NextFunction) => {
    try {
        req.body = await schema.parseAsync(req.body);
        return next();
    } catch (error) {
        if (error instanceof ZodError) {
            return sendError(
                res,
                400,
                ErrorCode.VALIDATION_ERROR,
                'Validation failed',
                error.format(),
                req
            );
        }
        return next(error);
    }
};
