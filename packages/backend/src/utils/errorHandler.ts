import { Response, Request } from 'express';

export enum ErrorCode {
    VALIDATION_ERROR = 'VALIDATION_ERROR',
    AUTHENTICATION_FAILED = 'AUTHENTICATION_FAILED',
    UNAUTHORIZED = 'UNAUTHORIZED',
    FORBIDDEN = 'FORBIDDEN',
    NOT_FOUND = 'NOT_FOUND',
    CONFLICT = 'CONFLICT',
    INTERNAL_ERROR = 'INTERNAL_ERROR',
    RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
    INSUFFICIENT_BALANCE = 'INSUFFICIENT_BALANCE',
    INVALID_DATE_RANGE = 'INVALID_DATE_RANGE',
    BAD_REQUEST = 'BAD_REQUEST',
}

export interface ApiError {
    code: ErrorCode;
    message: string;
    details?: any;
    timestamp: string;
    requestId?: string;
}

export const sendError = (
    res: Response,
    statusCode: number,
    code: ErrorCode,
    message: string,
    details?: any,
    req?: Request
): void => {
    const error: ApiError = {
        code,
        message,
        timestamp: new Date().toISOString(),
    };

    if (details) {
        error.details = details;
    }

    // Add request ID if available
    if (req && (req as any).id) {
        error.requestId = (req as any).id;
    }

    res.status(statusCode).json({ error });
};

export const sendSuccess = (
    res: Response,
    data: any,
    statusCode: number = 200
): void => {
    res.status(statusCode).json(data);
};
