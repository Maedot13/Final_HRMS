
// @ts-nocheck
import { PrismaClient, ClearanceStatus } from '@prisma/client';
import * as authService from '../src/services/auth.service';
import * as clearanceService from '../src/services/clearance.service';
import { UserRole } from '@hrms/types';

const prisma = new PrismaClient();

async function main() {
    console.log('🚀 Starting Dynamic Clearance Verification...');

    const empId = 'CLEAR_TEST_EMP';
    const approverId = 'CLEAR_TEST_ADMIN';

    // 1. Cleanup
    // Need to find IDs first to clean related records
    const existingEmp = await prisma.employee.findUnique({ where: { employeeId: empId } });
    if (existingEmp) {
        // Find clearance requests to delete checks first
        const requests = await prisma.clearanceRequest.findMany({ where: { employeeId: existingEmp.id } });
        for (const req of requests) {
            await prisma.clearanceCheck.deleteMany({ where: { clearanceId: req.id } });
        }
        await prisma.clearanceRequest.deleteMany({ where: { employeeId: existingEmp.id } });
        await prisma.refreshToken.deleteMany({ where: { userId: existingEmp.userId } });
        await prisma.employee.delete({ where: { id: existingEmp.id } });
        await prisma.user.delete({ where: { id: existingEmp.userId } });
    }
    const existingApprover = await prisma.employee.findUnique({ where: { employeeId: approverId } });
    if (existingApprover) {
        await prisma.refreshToken.deleteMany({ where: { userId: existingApprover.userId } });
        await prisma.employee.delete({ where: { id: existingApprover.id } });
        await prisma.user.delete({ where: { id: existingApprover.userId } });
    }

    // 2. Register Actors
    console.log('👤 Registering Employee...');
    const empReg = await authService.register({
        name: 'Clearance Seeker',
        employeeId: empId,
        department: 'Science',
        password: 'password123',
        role: UserRole.EMPLOYEE
    });
    const empDbId = (empReg.user as any).employee.id;

    console.log('👑 Registering Approver...');
    const appReg = await authService.register({
        name: 'Super Approver',
        employeeId: approverId,
        department: 'Admin',
        password: 'password123',
        role: UserRole.ADMIN
    });
    const appDbId = (appReg.user as any).employee.id;

    // 3. Initiate Clearance
    console.log('🏁 Initiating Clearance...');
    const lastWorkingDay = new Date();
    lastWorkingDay.setDate(lastWorkingDay.getDate() + 30); // 30 days from now
    const request = await clearanceService.initiateClearance(empDbId, 'Resignation', lastWorkingDay);

    if (!(request as any).checks || (request as any).checks.length === 0) throw new Error('No clearance checks generated');
    console.log(`✅ Generated ${(request as any).checks.length} clearance checks for active units`);

    // 4. Approve ONE check (e.g., the first one)
    const firstCheck = (request as any).checks[0];
    console.log(`✅ Approving Check for Unit: ${firstCheck.unit.name}...`);

    // We need unitId, not checkId for the service function signature
    const result1 = await clearanceService.approveCheck(request.id, firstCheck.unitId, appDbId, 'All clear here');
    if (result1.status !== 'PROGRESS') throw new Error('Should still be in PROGRESS');
    console.log('✅ Partial approval confirmed (Status: PROGRESS)');

    // 5. Approve ALL remaining checks
    console.log('🚀 Approving ALL remaining checks...');
    for (const check of (request as any).checks) {
        if (check.unitId === firstCheck.unitId) continue; // Skip already approved
        await clearanceService.approveCheck(request.id, check.unitId, appDbId, 'Batch approval');
    }

    // 6. Verify Completion
    const finalRequest = await prisma.clearanceRequest.findUnique({ where: { id: request.id } });
    if (finalRequest?.status !== ClearanceStatus.APPROVED) throw new Error('Clearance Status should be APPROVED (Detailed logic depends on enum mapping)');
    console.log('🎉 Clearance Status is APPROVED (COMPLETE)');

    // Cleanup
    await prisma.clearanceCheck.deleteMany({ where: { clearanceId: request.id } });
    await prisma.clearanceRequest.deleteMany({ where: { id: request.id } });

    await prisma.refreshToken.deleteMany({ where: { userId: empReg.user.id } });
    await prisma.employee.delete({ where: { userId: empReg.user.id } });
    await prisma.user.delete({ where: { id: empReg.user.id } });

    await prisma.refreshToken.deleteMany({ where: { userId: appReg.user.id } });
    await prisma.employee.delete({ where: { userId: appReg.user.id } });
    await prisma.user.delete({ where: { id: appReg.user.id } });

    console.log('🎉 Dynamic Clearance Verification Passed!');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
