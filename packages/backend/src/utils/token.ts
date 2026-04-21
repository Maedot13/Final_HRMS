
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { UserRole, UserScope } from '@hrms/types';

export interface TokenPayload {
    userId: number;
    role: UserRole;
    scope?: UserScope;
    campusId?: number | null;
    employeeId?: string | null;
    employeePkId?: number | null;
    mustChangePassword?: boolean;
    isHeadHR?: boolean;
    specialPrivileges?: string[];
    exp?: number;
}

export const generateToken = (payload: TokenPayload): string => {
    return jwt.sign(payload, env.JWT_SECRET, {
        expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'],
    });
};

export const verifyToken = (token: string): TokenPayload => {
    try {
        return jwt.verify(token, env.JWT_SECRET) as TokenPayload;
    } catch {
        throw new Error('Invalid token');
    }
};

import crypto from 'crypto';

export const generateRefreshToken = (payload: TokenPayload): string => {
    return jwt.sign({ ...payload, jti: crypto.randomUUID() }, env.JWT_REFRESH_SECRET, {
        expiresIn: env.JWT_REFRESH_EXPIRES_IN as jwt.SignOptions['expiresIn'],
    });
};

export const verifyRefreshToken = (token: string): TokenPayload => {
    try {
        return jwt.verify(token, env.JWT_REFRESH_SECRET) as TokenPayload;
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        throw new Error(`Malformed or expired refresh token: ${message}`);
    }
};
