
import { PrismaClient, User, Employee } from '@prisma/client';
import { LoginRequest, RegisterRequest, AuthResponse, UserRole } from '@hrms/types';
import { hashPassword, comparePassword } from '../utils/password';
import { generateToken } from '../utils/token';

const prisma = new PrismaClient();

export const login = async (data: LoginRequest): Promise<AuthResponse> => {
    const { email, password } = data;

    const user = await prisma.user.findUnique({
        where: { email },
        include: { employee: true } // Include employee details
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

    // Remove passwordHash from response
    const { passwordHash, ...userWithoutPassword } = user;

    // Cast to User type from shared types (which matches Prisma user mostly, but has role as enum)
    const userResponse: any = {
        ...userWithoutPassword,
        role: user.role as UserRole
    };

    return {
        token,
        user: userResponse
    };
};

export const register = async (data: RegisterRequest): Promise<AuthResponse> => {
    const { email, password, name, employeeId, department, role } = data;

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
        throw new Error('Email already in use');
    }

    const existingEmployeeId = await prisma.employee.findUnique({ where: { employeeId } });
    if (existingEmployeeId) {
        throw new Error('Employee ID already in use');
    }

    const hashedPassword = await hashPassword(password);

    // Use transaction to create User and Employee atomically
    const result = await prisma.$transaction(async (tx) => {
        const newUser = await tx.user.create({
            data: {
                email,
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
                position: 'TBD', // Default or add to registration payload
                hireDate: new Date(), // Default to now
                contactInfo: {}, // Default empty or add to payload
            }
        });

        return { newUser, newEmployee };
    });

    const token = generateToken({
        userId: result.newUser.id,
        role: result.newUser.role as UserRole,
        employeeId: result.newUser.employeeId
    });

    const { passwordHash, ...userWithoutPassword } = result.newUser;

    const userResponse: any = {
        ...userWithoutPassword,
        role: result.newUser.role as UserRole
    };

    return {
        token,
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
