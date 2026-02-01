
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { UserRole } from '@hrms/types';

export interface TokenPayload {
    userId: number;
    role: UserRole;
    employeeId?: string | null;
}

export const generateToken = (payload: TokenPayload): string => {
    return jwt.sign(payload, env.JWT_SECRET, {
        expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'],
    });
};

export const verifyToken = (token: string): TokenPayload => {
    try {
        return jwt.verify(token, env.JWT_SECRET) as TokenPayload;
    } catch (error) {
        throw new Error('Invalid token');
    }
};
