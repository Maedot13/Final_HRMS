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
    PASSWORD_CHANGE_REQUIRED = 'PASSWORD_CHANGE_REQUIRED',
    UNIQUE_CONSTRAINT_VIOLATION = 'UNIQUE_CONSTRAINT_VIOLATION'
}

export class AppError extends Error {
    public readonly statusCode: number;
    public readonly code: ErrorCode;
    public readonly details?: unknown;

    constructor(statusCode: number, code: ErrorCode, message: string, details?: unknown) {
        super(message);
        this.statusCode = statusCode;
        this.code = code;
        this.details = details;
        Object.setPrototypeOf(this, AppError.prototype);
    }
}

export interface ApiErrorResponse {
    code: ErrorCode;
    message: string;
    details?: unknown;
    timestamp: string;
    requestId?: string;
}

export const sendError = (
    res: Response,
    statusCode: number,
    code: ErrorCode,
    message: string,
    details?: unknown,
    req?: Request
): void => {
    const errorResponse: ApiErrorResponse = {
        code,
        message,
        timestamp: new Date().toISOString(),
    };

    if (details) {
        errorResponse.details = details;
    }

    // Add request ID if available
    if (req && 'id' in req) {
        errorResponse.requestId = (req as any).id;
    }

    res.status(statusCode).json(errorResponse);
};

export const sendSuccess = (
    res: Response,
    data: unknown,
    statusCode: number = 200
): void => {
    res.status(statusCode).json(data);
};
