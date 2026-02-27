
import { PrismaClient, LeaveStatus } from '@prisma/client';
import * as authService from '../src/services/auth.service';
import * as sabbaticalService from '../src/services/sabbatical.service';
import * as employeeService from '../src/services/employee.service';
import { UserRole } from '@hrms/types';

const prisma = new PrismaClient();

// Script-level creator context: scripts run with admin-level access directly against the DB.
// campusId will be resolved at runtime from the first active campus.
async function getScriptCreatorContext() {
    const campus = await prisma.campus.findFirst({ where: { isActive: true }, orderBy: { code: 'asc' } });
    if (!campus) throw new Error('No active campus found. Run seed first.');
    return { userId: 0, role: UserRole.ADMIN as any, scope: 'UNIVERSITY' as any, campusId: campus.id, employeeId: 'SYSTEM' };
}

async function main() {
    console.log('🚀 Starting Sabbatical Verification...');
    const creatorContext = await getScriptCreatorContext();

    const empId = 'SABB_TEST_EMP';
    const headId = 'SABB_TEST_HEAD';

    // 1. Cleanup
    const existingEmp = await prisma.employee.findUnique({ where: { employeeId: empId } });
    if (existingEmp) {
        await prisma.refreshToken.deleteMany({ where: { userId: existingEmp.userId } });
        await prisma.sabbaticalRequest.deleteMany({ where: { employeeId: existingEmp.id } });
        await prisma.employee.delete({ where: { id: existingEmp.id } });
        await prisma.user.delete({ where: { id: existingEmp.userId } });
    }
    const existingHead = await prisma.employee.findUnique({ where: { employeeId: headId } });
    if (existingHead) {
        await prisma.refreshToken.deleteMany({ where: { userId: existingHead.userId } });
        await prisma.employee.delete({ where: { id: existingHead.id } });
        await prisma.user.delete({ where: { id: existingHead.userId } });
    }

    // 2. Register Employee (0 years service default)
    console.log('👤 Registering Employee...');
    const empReg = await authService.register({
        name: 'Sabbatical Seeker',
        email: 'sabb_emp@example.com',
        employeeId: empId,
        department: 'Science',
        password: 'password123',
        role: UserRole.EMPLOYEE,
        campusId: creatorContext.campusId
    }, creatorContext);
    const empDbId = (empReg.user as any).employee.id;

    // 3. Register Head
    const headReg = await authService.register({
        name: 'Science Head',
        email: 'sabb_head@example.com',
        employeeId: headId,
        department: 'Science',
        password: 'password123',
        role: UserRole.DEPARTMENT_HEAD,
        campusId: creatorContext.campusId
    }, creatorContext);
    const headDbId = (headReg.user as any).employee.id;

    // 4. Test Eligibility (Should Fail - 0 years)
    console.log('🚫 Testing Eligibility (0 Years)...');
    try {
        await sabbaticalService.createSabbaticalRequest(empDbId, {
            purpose: 'Research',
            startDate: '2026-03-01T00:00:00Z',
            endDate: '2026-09-01T00:00:00Z',
            plan: 'Study quantum physics'
        });
        throw new Error('Should have failed eligibility check');
    } catch (e: any) {
        if (e.message.includes('Not eligible')) console.log('✅ Eligibility check passed (0 years)');
        else throw e;
    }

    // 5. Update Service Years to 7
    console.log('✨ Updating Service Years to 7...');
    await employeeService.updateEmployee(empDbId, { serviceYears: 7 });

    // 6. Test Duration Limit (Should Fail - 13 months)
    console.log('🚫 Testing Duration Limit (> 12 months)...');
    try {
        await sabbaticalService.createSabbaticalRequest(empDbId, {
            purpose: 'Research',
            startDate: '2026-01-01T00:00:00Z',
            endDate: '2027-02-01T00:00:00Z', // 13 months
            plan: 'Long study'
        });
        throw new Error('Should have failed duration check');
    } catch (e: any) {
        if (e.message.includes('duration cannot exceed 12 months')) console.log('✅ Duration check passed');
        else throw e;
    }

    // 7. Create Valid Request
    console.log('✅ Creating Valid Request...');
    const request = await sabbaticalService.createSabbaticalRequest(empDbId, {
        purpose: 'PhD Research',
        startDate: '2026-01-01T00:00:00Z',
        endDate: '2026-12-01T00:00:00Z', // 11 months
        plan: 'Complete dissertation'
    });
    if (!request) throw new Error('Failed to create request');
    console.log('✅ Request created successfully');

    // 8. Approve Request
    console.log('👑 Approving Request...');
    const approved = await sabbaticalService.approveSabbatical(request.id, headDbId, null, 'Good luck');
    if (approved.status !== LeaveStatus.APPROVED) throw new Error('Status failed');
    console.log('✅ Approval successful');

    // Cleanup
    await prisma.sabbaticalRequest.deleteMany({ where: { employeeId: empDbId } });
    await prisma.refreshToken.deleteMany({ where: { userId: empReg.user.id } });
    await prisma.employee.delete({ where: { userId: empReg.user.id } });
    await prisma.user.delete({ where: { id: empReg.user.id } });

    await prisma.refreshToken.deleteMany({ where: { userId: headReg.user.id } });
    await prisma.employee.delete({ where: { userId: headReg.user.id } });
    await prisma.user.delete({ where: { id: headReg.user.id } });

    console.log('🎉 Sabbatical Verification Passed!');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
