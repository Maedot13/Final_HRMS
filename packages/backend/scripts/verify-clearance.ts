
import { PrismaClient, UserRole, ClearanceStatus } from '@prisma/client';
import * as clearanceService from '../src/services/clearance.service';

const prisma = new PrismaClient();

async function main() {
    console.log('🧪 Starting Clearance Verification...');

    // 1. Setup Data
    console.log('\n--- 1. Setting up User & Employee ---');
    // Ensure we have an employee to test with.
    // We'll create a dummy one if not exists or pick the first one.
    let user = await prisma.user.findFirst({ where: { employeeId: 'TEST_EMP_001' } });
    if (!user) {
        user = await prisma.user.create({
            data: {
                employeeId: 'TEST_EMP_001',
                passwordHash: 'dummy',
                role: UserRole.EMPLOYEE,
                employee: {
                    create: {
                        name: 'Test Employee',
                        department: 'Engineering',
                        position: 'Developer',
                        hireDate: new Date(),
                        contactInfo: {},
                        employeeId: 'TEST_EMP_001'
                    }
                }
            }
        });
        console.log('Created Test User & Employee');
    } else {
        console.log('Using existing Test User');
    }

    const employee = await prisma.employee.findUnique({ where: { userId: user.id } });
    if (!employee) throw new Error('Employee not found');

    // Clean up any existing active clearance for this user to restart test
    await prisma.clearanceRequest.deleteMany({ where: { employeeId: employee.id } });

    // 2. Initiate Clearance
    console.log('\n--- 2. Initiating Clearance ---');
    const clearance = await clearanceService.initiateClearance(employee.id, 'Resignation', new Date());
    console.log(`Clearance Initiated: ID ${clearance.id}, Status: ${clearance.status}`);
    console.log(`Checks Created: ${clearance.checks.length}`);

    if (clearance.checks.length === 0) throw new Error('No checks created! Seeding might have failed.');

    // 3. Approve First Check
    console.log('\n--- 3. Approving First Check ---');
    const firstCheck = clearance.checks[0];
    const approverId = user.id; // Self-approval for test simplicity (in real app, specific roles)

    await clearanceService.approveCheck(clearance.id, firstCheck.unitId, approverId, 'Looks good');
    console.log(`Approved Unit: ${firstCheck.unitId}`);

    // Verify it's still pending overall
    const updatedClearance1 = await clearanceService.getClearance(clearance.id);
    console.log(`Clearance Status (should be PENDING): ${updatedClearance1?.status}`);

    // 4. Reject Second Check
    console.log('\n--- 4. Rejecting Second Check ---');
    const secondCheck = clearance.checks[1];
    await clearanceService.rejectCheck(clearance.id, secondCheck.unitId, approverId, 'Missing item');
    console.log(`Rejected Unit: ${secondCheck.unitId}`);

    const check2 = await prisma.clearanceCheck.findUnique({ where: { id: secondCheck.id } });
    console.log(`Check 2 Status (should be REJECTED): ${check2?.status}`);

    // 5. Fix & Approve Second Check
    console.log('\n--- 5. Fixing & Approving Second Check ---');
    // Re-approving a rejected check should work (workflow: employee fixed it -> approver approves)
    // Note: My implementation checks `if (check.status === ClearanceStatus.APPROVED) throw ...` so REJECTED -> APPROVED is allowed.
    await clearanceService.approveCheck(clearance.id, secondCheck.unitId, approverId, 'Fixed now');
    console.log(`Approved Unit: ${secondCheck.unitId} (previously rejected)`);

    // 6. Approve Remaining Checks
    console.log('\n--- 6. Approving Remaining Checks ---');
    for (const check of clearance.checks.slice(2)) {
        await clearanceService.approveCheck(clearance.id, check.unitId, approverId, 'Auto approved');
    }
    console.log('All checks approved.');

    // 7. Verify Completion & Payroll Transfer
    console.log('\n--- 7. Verifying Completion ---');
    const finalClearance = await clearanceService.getClearance(clearance.id);
    console.log(`Final Clearance Status (should be APPROVED): ${finalClearance?.status}`);

    const transfer = await prisma.payrollTransfer.findUnique({ where: { clearanceId: clearance.id } });
    console.log(`Payroll Transfer Created: ${!!transfer}`);
    if (transfer) {
        console.log(`Transfer Status: ${transfer.status}`);
        console.log(`Transfer Effective Date: ${transfer.effectiveDate}`);
    } else {
        throw new Error('Payroll Transfer was NOT created!');
    }

    console.log('\n✅ Verification Successful!');
}

main()
    .catch(e => {
        console.error('❌ Verification Failed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
