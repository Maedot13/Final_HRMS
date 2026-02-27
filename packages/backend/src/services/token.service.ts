import { UserRole, UserScope } from '@hrms/types';
import { generateToken, generateRefreshToken, verifyRefreshToken } from '../utils/token';
import { prisma } from '../lib/prisma';

interface TokenPayloadArgs {
    userId: number;
    role: UserRole;
    scope: UserScope;
    campusId: number | null;
    employeeId: string;
    mustChangePassword?: boolean;
}

export const getTokenExpiration = (token: string): Date => {
    const decoded = verifyRefreshToken(token);
    if (!decoded || !decoded.exp) {
        throw new Error('Invalid token format or signature');
    }
    return new Date(decoded.exp * 1000);
};

export const createTokenPair = async (payload: TokenPayloadArgs) => {
    const token = generateToken(payload);
    const refreshTokenString = generateRefreshToken(payload);

    // Save refresh token to DB
    await prisma.refreshToken.create({
        data: {
            token: refreshTokenString,
            userId: payload.userId,
            expiresAt: getTokenExpiration(refreshTokenString)
        }
    });

    return { token, refreshToken: refreshTokenString };
};

export const rotateTokenPair = async (oldTokenId: number, userId: number, payload: TokenPayloadArgs) => {
    const newAccessToken = generateToken(payload);
    const newRefreshTokenString = generateRefreshToken(payload);

    await prisma.$transaction([
        prisma.refreshToken.update({
            where: { id: oldTokenId },
            data: {
                revoked: true,
                replacedBy: newRefreshTokenString
            }
        }),
        prisma.refreshToken.create({
            data: {
                token: newRefreshTokenString,
                userId,
                expiresAt: getTokenExpiration(newRefreshTokenString)
            }
        })
    ]);

    return {
        token: newAccessToken,
        refreshToken: newRefreshTokenString
    };
};
