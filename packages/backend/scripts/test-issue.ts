import { PrismaClient } from '@prisma/client';
import * as authService from '../src/services/auth.service';
import { UserRole } from '@hrms/types';

const prisma = new PrismaClient();

async function getScriptCreatorContext() {
    const campus = await prisma.campus.findFirst({ where: { isActive: true }, orderBy: { code: 'asc' } });
    if (!campus) throw new Error('No active campus found. Run seed first.');
    return { userId: 0, role: 'ADMIN' as any, scope: 'UNIVERSITY' as any, campusId: campus.id, employeeId: 'SYSTEM' };
}

async function main() {
    const creatorContext = await getScriptCreatorContext();
    const testEmployeeId = 'TEST_EMP_DEBUG';

    // Cleanup
    const existingEmp = await prisma.employee.findUnique({ where: { employeeId: testEmployeeId } });
    if (existingEmp) {
        await prisma.refreshToken.deleteMany({ where: { userId: existingEmp.userId } });
        await prisma.employee.delete({ where: { id: existingEmp.id } });
        await prisma.user.delete({ where: { id: existingEmp.userId } });
    }
    const existingUser = await prisma.user.findUnique({ where: { employeeId: testEmployeeId } });
    if (existingUser) {
        await prisma.refreshToken.deleteMany({ where: { userId: existingUser.id } });
        await prisma.user.delete({ where: { id: existingUser.id } });
    }

    // Register
    console.log('Registering...');
    try {
        const registerRes = await authService.register({
            name: 'DEBUG User',
            email: 'debug@example.com',
            employeeId: testEmployeeId,
            department: 'IT',
            password: 'Password123!',
            role: UserRole.EMPLOYEE,
            campusId: creatorContext.campusId
        }, creatorContext);
        
        console.log('Registration details:', registerRes);
        
        const dbUser = await prisma.user.findUnique({ where: { employeeId: testEmployeeId }});
        console.log('DB User:', dbUser?.passwordHash?.substring(0, 10), '...', 'mustChangePassword:', dbUser?.mustChangePassword);
        
        // Login
        console.log('Logging in...');
        const loginRes = await authService.login({
            employeeId: testEmployeeId,
            password: 'Password123!'
        });
        console.log('Login successful');
    } catch (err: any) {
        console.error('Error:', err.message);
    }
}

main().finally(() => prisma.$disconnect());
