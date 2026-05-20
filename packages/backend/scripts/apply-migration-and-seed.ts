import { prisma } from '../src/lib/prisma';
import { LeaveStatus, LeaveType, LeaveStage } from '@prisma/client';

async function main() {
    console.log('Running raw SQL migrations...');
    try {
        // Alter clearanceId to be optional
        await prisma.$executeRawUnsafe(`ALTER TABLE "PayrollTransfer" ALTER COLUMN "clearanceId" DROP NOT NULL;`);
        console.log('Altered clearanceId to drop not null.');
    } catch (e: any) {
        console.log('clearanceId might already be optional:', e.message);
    }

    try {
        await prisma.$executeRawUnsafe(`ALTER TABLE "PayrollTransfer" ADD COLUMN "leaveId" INTEGER UNIQUE;`);
        console.log('Added leaveId to PayrollTransfer.');
    } catch (e: any) {
        console.log('leaveId might already exist:', e.message);
    }

    try {
        await prisma.$executeRawUnsafe(`
            ALTER TABLE "PayrollTransfer" ADD CONSTRAINT "PayrollTransfer_leaveId_fkey" 
            FOREIGN KEY ("leaveId") REFERENCES "LeaveRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;
        `);
        console.log('Added foreign key for leaveId.');
    } catch (e: any) {
        console.log('Foreign key might already exist:', e.message);
    }

    try {
        await prisma.$executeRawUnsafe(`ALTER TABLE "PayrollReport" ADD COLUMN "reportUrl" TEXT NOT NULL DEFAULT '';`);
        console.log('Added reportUrl to PayrollReport.');
    } catch (e: any) {
        console.log('reportUrl might already exist:', e.message);
    }

    try {
        await prisma.$executeRawUnsafe(`ALTER TABLE "PayrollReport" ADD COLUMN "status" TEXT NOT NULL DEFAULT 'SENT';`);
        console.log('Added status to PayrollReport.');
    } catch (e: any) {
        console.log('status might already exist:', e.message);
    }

    try {
        await prisma.$executeRawUnsafe(`ALTER TABLE "PayrollReport" ADD COLUMN "campusId" INTEGER NOT NULL DEFAULT 1;`);
        console.log('Added campusId to PayrollReport.');
    } catch (e: any) {
        console.log('campusId might already exist:', e.message);
    }

    try {
        await prisma.$executeRawUnsafe(`ALTER TABLE "PayrollReport" ADD COLUMN "createdById" INTEGER NOT NULL DEFAULT 1;`);
        console.log('Added createdById to PayrollReport.');
    } catch (e: any) {
        console.log('createdById might already exist:', e.message);
    }

    try {
        await prisma.$executeRawUnsafe(`ALTER TABLE "PayrollReport" ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;`);
        console.log('Added createdAt to PayrollReport.');
    } catch (e: any) {
        console.log('createdAt might already exist:', e.message);
    }

    try {
        await prisma.$executeRawUnsafe(`ALTER TABLE "PayrollReport" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;`);
        console.log('Added updatedAt to PayrollReport.');
    } catch (e: any) {
        console.log('updatedAt might already exist:', e.message);
    }

    console.log('Migrations applied successfully.');

    // Seed data for Finance
    console.log('Seeding leave salary data and Finance Reports...');

    // 1. Ensure a campus exists
    const campus = await prisma.campus.findFirst({ where: { isActive: true } });
    if (!campus) throw new Error('No active campus found.');

    // 2. Find or create an employee for the test
    let emp = await prisma.employee.findFirst({
        where: { user: { isActive: true }, campusId: campus.id }
    });

    if (!emp) {
        throw new Error('No active employee found to seed leave requests.');
    }

    // 3. Create an APPROVED RESEARCH Leave Request
    const startDate = new Date();
    startDate.setDate(1); // 1st of current month
    const endDate = new Date(startDate);
    endDate.setDate(15); // 15th of current month (15 days)

    const leave = await prisma.leaveRequest.create({
        data: {
            employeeId: emp.id,
            leaveType: LeaveType.RESEARCH,
            startDate,
            endDate,
            days: 15,
            reason: 'Seeded Research Leave',
            status: LeaveStatus.APPROVED,
            currentStage: LeaveStage.HR_OFFICER,
            campusId: campus.id,
        }
    });
    console.log(`Created LeaveRequest ${leave.id}`);

    // 4. Create PayrollTransfer for it
    const pt = await prisma.payrollTransfer.create({
        data: {
            employeeId: emp.id,
            leaveId: leave.id,
            reason: 'RESEARCH Leave Approved',
            effectiveDate: startDate,
            status: 'PENDING',
            createdBy: emp.userId
        }
    });
    console.log(`Created PayrollTransfer ${pt.id}`);

    console.log('Done.');
}

main().catch(console.error).finally(() => prisma.$disconnect());
