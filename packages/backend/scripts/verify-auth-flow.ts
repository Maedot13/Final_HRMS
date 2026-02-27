
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
    console.log('🚀 Starting Auth Flow Verification...');
    const creatorContext = await getScriptCreatorContext();

    const testEmployeeId = 'TEST_EMP_001';
    const testEmail = 'test@example.com';

    // 1. Cleanup
    console.log('🧹 Cleaning up previous test data...');
    const existingEmp = await prisma.employee.findUnique({ where: { employeeId: testEmployeeId } });
    if (existingEmp) {
        await prisma.refreshToken.deleteMany({ where: { userId: existingEmp.userId } });
        await prisma.employee.delete({ where: { id: existingEmp.id } });
        await prisma.user.delete({ where: { id: existingEmp.userId } });
    }

    // 2. Register
    console.log('📝 Testing Register...');
    const registerRes = await authService.register({
        name: 'Test User',
        email: testEmail,
        employeeId: testEmployeeId,
        department: 'IT',
        password: 'Password123!',
        role: UserRole.EMPLOYEE,
        campusId: creatorContext.campusId
    }, creatorContext);

    if (!registerRes.token || !registerRes.refreshToken) throw new Error('Register failed to return tokens');
    console.log('✅ Register successful');

    // 3. Login
    console.log('🔑 Testing Login...');
    const loginRes = await authService.login({
        employeeId: testEmployeeId,
        password: 'Password123!'
    });

    if (!loginRes.token || !loginRes.refreshToken) throw new Error('Login failed to return tokens');
    console.log('✅ Login successful');

    // 4. Verify DB State (Token exists)
    const initialToken = await prisma.refreshToken.findUnique({ where: { token: loginRes.refreshToken } });
    if (!initialToken) throw new Error('Refresh token not saved to DB');
    if (initialToken.revoked) throw new Error('New token should not be revoked');
    console.log('✅ Token saved to DB correctly');

    // 5. Refresh Token
    console.log('🔄 Testing Refresh Token...');
    // Wait a sec to ensure timestamp diff if any (optional)
    const refreshRes = await authService.refreshToken(loginRes.refreshToken);

    if (!refreshRes.token || !refreshRes.refreshToken) throw new Error('Refresh failed');
    if (refreshRes.refreshToken === loginRes.refreshToken) throw new Error('Refresh token should be rotated');
    console.log('✅ Refresh successful. Tokens rotated.');

    // 6. Verify Rotation (Old revoked, New exists)
    const oldToken = await prisma.refreshToken.findUnique({ where: { token: loginRes.refreshToken } });
    const newToken = await prisma.refreshToken.findUnique({ where: { token: refreshRes.refreshToken } });

    if (!oldToken?.revoked) throw new Error('Old token was not revoked');
    if (oldToken.replacedBy !== refreshRes.refreshToken) throw new Error('Old token logic broken (replacedBy)');
    if (!newToken) throw new Error('New token not found in DB');
    console.log('✅ Rotation logic verified');

    // 7. Logout
    console.log('🚪 Testing Logout...');
    await authService.logout(refreshRes.refreshToken);

    const loggedOutToken = await prisma.refreshToken.findUnique({ where: { token: refreshRes.refreshToken } });
    if (!loggedOutToken?.revoked) throw new Error('Token not revoked after logout');
    console.log('✅ Logout successful');

    // 8. Try Refresh with Revoked Token (Should fail)
    console.log('🚫 Testing Revoked Token Re-use...');
    try {
        await authService.refreshToken(refreshRes.refreshToken);
        throw new Error('Should have failed!');
    } catch (error: any) {
        if (error.message.includes('revoked')) {
            console.log('✅ Detected usage of revoked token correctly');
        } else {
            throw error;
        }
    }

    // Cleanup
    await prisma.refreshToken.deleteMany({ where: { userId: registerRes.user.id } });
    await prisma.employee.delete({ where: { userId: registerRes.user.id } });
    await prisma.user.delete({ where: { id: registerRes.user.id } });

    console.log('🎉 All Verify Steps Passed!');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
