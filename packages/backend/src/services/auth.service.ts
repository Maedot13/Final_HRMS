
import { PrismaClient, User, Employee } from '@prisma/client';
import { LoginRequest, RegisterRequest, AuthResponse, UserRole } from '@hrms/types';
import { hashPassword, comparePassword } from '../utils/password';
import { generateToken, generateRefreshToken, verifyRefreshToken } from '../utils/token';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();

// Helper to get expiration date from JWT token
const getTokenExpiration = (token: string): Date => {
    // SECURITY: Use verifyToken instead of decode to ensure the token is valid before reading claims
    const decoded = verifyRefreshToken(token);
    if (!decoded || !decoded.exp) {
        throw new Error('Invalid token format or signature');
    }
    return new Date(decoded.exp * 1000);
};

export const login = async (data: LoginRequest): Promise<AuthResponse> => {
    const { employeeId, password } = data;

    const user = await prisma.user.findUnique({
        where: { employeeId },
        include: { employee: true }
    });

    if (!user) {
        throw new Error('Invalid credentials');
    }

    const isPasswordValid = await comparePassword(password, user.passwordHash);

    if (!isPasswordValid) {
        throw new Error('Invalid credentials');
    }

    if (!user.isActive) {
        throw new Error('Account is deactivated');
    }

    const token = generateToken({
        userId: user.id,
        role: user.role as UserRole,
        employeeId: user.employeeId
    });

    const refreshTokenString = generateRefreshToken({
        userId: user.id,
        role: user.role as UserRole,
        employeeId: user.employeeId
    });

    // Save refresh token to DB
    await prisma.refreshToken.create({
        data: {
            token: refreshTokenString,
            userId: user.id,
            expiresAt: getTokenExpiration(refreshTokenString)
        }
    });

    const { passwordHash, ...userWithoutPassword } = user;
    const userResponse: any = {
        ...userWithoutPassword,
        role: user.role as UserRole
    };

    return {
        token,
        refreshToken: refreshTokenString,
        user: userResponse
    };
};

export const register = async (data: RegisterRequest): Promise<AuthResponse> => {
    const { password, name, employeeId, department, role } = data;

    const existingEmployee = await prisma.employee.findUnique({ where: { employeeId } });
    if (existingEmployee) {
        throw new Error('Employee ID already in use (Employee table)');
    }

    const existingUser = await prisma.user.findUnique({ where: { employeeId } });
    if (existingUser) {
        throw new Error('Employee ID already in use (User table)');
    }

    const hashedPassword = await hashPassword(password);

    // Use transaction to create User and Employee atomically
    const result = await prisma.$transaction(async (tx) => {
        const newUser = await tx.user.create({
            data: {
                passwordHash: hashedPassword,
                role: role || UserRole.EMPLOYEE,
                employeeId,
            }
        });

        const newEmployee = await tx.employee.create({
            data: {
                userId: newUser.id,
                employeeId,
                name,
                department,
                position: 'TBD',
                hireDate: new Date(),
                contactInfo: {},
            }
        });

        return { newUser, newEmployee };
    });

    const token = generateToken({
        userId: result.newUser.id,
        role: result.newUser.role as UserRole,
        employeeId: result.newUser.employeeId
    });

    const refreshTokenString = generateRefreshToken({
        userId: result.newUser.id,
        role: result.newUser.role as UserRole,
        employeeId: result.newUser.employeeId
    });

    // Save refresh token
    await prisma.refreshToken.create({
        data: {
            token: refreshTokenString,
            userId: result.newUser.id,
            expiresAt: getTokenExpiration(refreshTokenString)
        }
    });

    const { passwordHash, ...userWithoutPassword } = result.newUser;
    const userResponse: any = {
        ...userWithoutPassword,
        role: result.newUser.role as UserRole,
        employee: result.newEmployee
    };

    return {
        token,
        refreshToken: refreshTokenString,
        user: userResponse
    };
};

export const getMe = async (userId: number): Promise<any> => {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { employee: true }
    });

    if (!user) throw new Error('User not found');

    const { passwordHash, ...userWithoutPassword } = user;
    return {
        ...userWithoutPassword,
        role: user.role as UserRole
    };
}

export const refreshToken = async (token: string): Promise<AuthResponse> => {
    // 1. Verify signature
    const payload = verifyRefreshToken(token);

    // 2. Check DB for token status
    const dbToken = await prisma.refreshToken.findUnique({
        where: { token },
        include: { user: { include: { employee: true } } }
    });

    // Token reuse detection or simply not found
    if (!dbToken) {
        // If verifyRefreshToken succeeded but token not in DB, it might be a reused token that was deleted or never saved?
        // Or if we implemented rotation by deletion. But we use revoked flag.
        // If not found, suspicious.
        throw new Error('Refresh token not found in database');
    }

    if (dbToken.revoked) {
        // Token reuse detected!
        // Security Action: Revoke all tokens for this user family?
        // For now, just deny.
        throw new Error('Refresh token revoked');
    }

    const now = new Date();
    if (dbToken.expiresAt < now) {
        throw new Error('Refresh token expired');
    }

    const user = dbToken.user;
    if (!user.isActive) {
        throw new Error('User inactive');
    }

    // 3. Rotation: Revoke old, Issue new
    const newAccessToken = generateToken({
        userId: user.id,
        role: user.role as UserRole,
        employeeId: user.employeeId
    });

    const newRefreshTokenString = generateRefreshToken({
        userId: user.id,
        role: user.role as UserRole,
        employeeId: user.employeeId
    });

    // Transaction to revoke old and save new
    await prisma.$transaction([
        prisma.refreshToken.update({
            where: { id: dbToken.id },
            data: {
                revoked: true,
                replacedBy: newRefreshTokenString
            }
        }),
        prisma.refreshToken.create({
            data: {
                token: newRefreshTokenString,
                userId: user.id,
                expiresAt: getTokenExpiration(newRefreshTokenString)
            }
        })
    ]);

    const { passwordHash, ...userWithoutPassword } = user;
    const userResponse: any = {
        ...userWithoutPassword,
        role: user.role as UserRole
    };

    return {
        token: newAccessToken,
        refreshToken: newRefreshTokenString,
        user: userResponse
    };
};

export const logout = async (token: string): Promise<{ message: string }> => {
    // Revoke the specific refresh token
    await prisma.refreshToken.update({
        where: { token },
        data: { revoked: true }
    }).catch(() => {
        // Ignore if token not found (already deleted or invalid)
    });

    return { message: 'Logged out successfully' };
};
