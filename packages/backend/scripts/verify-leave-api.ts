
import { PrismaClient, LeaveType, LeaveStatus } from '@prisma/client';
import * as authService from '../src/services/auth.service';
import * as leaveService from '../src/services/leave.service';
import { UserRole } from '@hrms/types';

const prisma = new PrismaClient();

async function getScriptCreatorContext() {
    const campus = await prisma.campus.findFirst({ where: { isActive: true }, orderBy: { code: 'asc' } });
    if (!campus) throw new Error('No active campus found. Run seed first.');
    return { userId: 0, role: 'ADMIN' as any, scope: 'UNIVERSITY' as any, campusId: campus.id, employeeId: 'SYSTEM' };
}

async function main() {
    console.log('🚀 Starting Leave Management Verification...');
    const creatorContext = await getScriptCreatorContext();

    const empId = 'LEAVE_TEST_EMP';
    const headId = 'LEAVE_TEST_HEAD';

    // 1. Cleanup
    const existingEmp = await prisma.employee.findUnique({ where: { employeeId: empId } });
    if (existingEmp) {
        await prisma.refreshToken.deleteMany({ where: { userId: existingEmp.userId } });
        await prisma.leaveRequest.deleteMany({ where: { employeeId: existingEmp.id } });
        await prisma.leaveBalance.deleteMany({ where: { employeeId: existingEmp.id } });
        await prisma.employee.delete({ where: { id: existingEmp.id } });
        await prisma.user.delete({ where: { id: existingEmp.userId } });
    }
    const existingHead = await prisma.employee.findUnique({ where: { employeeId: headId } });
    if (existingHead) {
        await prisma.refreshToken.deleteMany({ where: { userId: existingHead.userId } });
        await prisma.employee.delete({ where: { id: existingHead.id } });
        await prisma.user.delete({ where: { id: existingHead.userId } });
    }

    // 2. Register Employee
    console.log('👤 Registering Employee...');
    const empReg = await authService.register({
        name: 'Leave Requester',
        email: 'leave_emp@example.com',
        employeeId: empId,
        department: 'IT',
        password: 'Password123!',
        role: UserRole.EMPLOYEE,
        campusId: creatorContext.campusId
    }, creatorContext);
    // Cast to access employee
    const empDbId = (empReg.user as any).employee.id;

    // 3. Register Dept Head
    console.log('👑 Registering Dept Head...');
    const headReg = await authService.register({
        name: 'IT Boss',
        email: 'leave_head@example.com',
        employeeId: headId,
        department: 'IT',
        password: 'Password123!',
        role: UserRole.DEPARTMENT_HEAD,
        campusId: creatorContext.campusId
    }, creatorContext);
    const headDbId = (headReg.user as any).employee.id;

    // 4. Create Leave Request (Annual)
    console.log('📅 Creating Leave Request...');
    const today = new Date();
    const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);

    // Service automatically inits balance if not exists (tested here)
    const request = await leaveService.createLeaveRequest(empDbId, {
        leaveType: LeaveType.ANNUAL,
        startDate: today.toISOString(),
        endDate: tomorrow.toISOString(),
        reason: 'Vacation'
    });

    if (request.status !== LeaveStatus.PENDING) throw new Error('Request should be PENDING');
    console.log('✅ Request created successfully');

    // 5. Verify Balance Created
    const balance = await prisma.leaveBalance.findUnique({
        where: { employeeId_year: { employeeId: empDbId, year: today.getFullYear() } }
    });
    if (!balance) throw new Error('Balance not initialized');
    if (balance.annualBalance !== 20) throw new Error('Default balance distinct from 20');
    console.log('✅ Balance initialized successfully');

    // 6. Test Insufficient Balance
    console.log('🚫 Testing Insufficient Balance...');
    try {
        await leaveService.createLeaveRequest(empDbId, {
            leaveType: LeaveType.ANNUAL,
            startDate: today.toISOString(),
            endDate: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 30).toISOString(),
            reason: 'Long Vacation'
        });
        throw new Error('Should fail due to insufficient balance');
    } catch (e: any) {
        if (e.message.includes('Insufficient leave balance')) console.log('✅ Balance check passed');
        else throw e;
    }

    // 7. Approve Request
    console.log('✅ Approving Request...');
    const approved = await leaveService.approveRequest(request.id, headDbId, 'IT', null, 'Have fun');
    if (approved.status !== LeaveStatus.APPROVED) throw new Error('Status not approved');

    // 8. Verify Balance Deduction
    const newBalance = await prisma.leaveBalance.findUnique({
        where: { id: balance.id }
    });
    const daysRequested = request.days;
    // Note: our calculateDays is rough, so let's verify logic consistent with request.days
    if (newBalance!.annualBalance !== (20 - daysRequested)) throw new Error(`Balance not deducted correctly. Expected ${20 - daysRequested}, got ${newBalance!.annualBalance}`);
    console.log(`✅ Balance deducted. New Balance: ${newBalance!.annualBalance}`);

    // Cleanup
    await prisma.leaveRequest.deleteMany({ where: { employeeId: empDbId } });
    await prisma.leaveBalance.deleteMany({ where: { employeeId: empDbId } });
    await prisma.refreshToken.deleteMany({ where: { userId: empReg.user.id } });
    await prisma.employee.delete({ where: { userId: empReg.user.id } });
    await prisma.user.delete({ where: { id: empReg.user.id } });

    await prisma.refreshToken.deleteMany({ where: { userId: headReg.user.id } });
    await prisma.employee.delete({ where: { userId: headReg.user.id } });
    await prisma.user.delete({ where: { id: headReg.user.id } });

    console.log('🎉 Leave Management Verification Passed!');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
