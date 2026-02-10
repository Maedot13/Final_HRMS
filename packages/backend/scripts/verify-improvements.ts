
import { PrismaClient, LeaveStatus, UserRole } from '@prisma/client';
import * as leaveService from '../src/services/leave.service';
import * as sabbaticalService from '../src/services/sabbatical.service';
import * as authService from '../src/services/auth.service';

const prisma = new PrismaClient();

async function main() {
    try {
        console.log('--- Comprehensive Verification Started ---');

        // Setup: Find/Create an employee
        let employee = await prisma.employee.findFirst();
        if (!employee) {
            console.log('Creating test employee...');
            const auth = await authService.register({
                employeeId: 'VULN-FIX-TEST-01',
                name: 'Test Engineer',
                password: 'Password123!',
                department: 'Engineering',
                role: 'EMPLOYEE' as any
            });
            employee = auth.user.employee as any;
        }

        const approver = await prisma.employee.findFirst({
            where: { user: { role: 'DEPARTMENT_HEAD' as any } }
        });

        if (!employee || !approver) {
            throw new Error('Test environment setup failed: Need an employee and a Dept Head approver');
        }

        console.log(`Using Employee ID: ${employee.id}, Approver ID: ${approver.id}`);

        // 1. Test Date Overlap
        console.log('\n1. Testing Date Overlap Validation...');
        await prisma.leaveBalance.upsert({
            where: { employeeId_year: { employeeId: employee.id, year: new Date().getFullYear() } },
            update: { annualBalance: 50 },
            create: { employeeId: employee.id, year: new Date().getFullYear(), annualBalance: 50 }
        });

        const start = new Date(Date.now() + 86400000 * 10);
        const end = new Date(Date.now() + 86400000 * 15);

        await leaveService.createLeaveRequest(employee.id, {
            leaveType: 'ANNUAL',
            startDate: start.toISOString(),
            endDate: end.toISOString(),
            reason: 'Original request'
        });
        console.log('Created first leave request.');

        try {
            await leaveService.createLeaveRequest(employee.id, {
                leaveType: 'ANNUAL',
                startDate: new Date(start.getTime() + 86400000).toISOString(),
                endDate: new Date(end.getTime() - 86400000).toISOString(),
                reason: 'Overlapping request'
            });
            console.error('FAIL: Managed to create overlapping leave request!');
        } catch (error: any) {
            console.log(`SUCCESS: Overlap blocked: ${error.message}`);
        }

        // 2. Test Sabbatical Cooldown
        console.log('\n2. Testing Sabbatical 7-Year Cooldown...');
        await prisma.employee.update({
            where: { id: employee.id },
            data: { serviceYears: 10 }
        });

        const sabStart = new Date();
        sabStart.setFullYear(sabStart.getFullYear() + 2); // Avoid overlap with leave test
        const sabEnd = new Date(sabStart);
        sabEnd.setFullYear(sabEnd.getFullYear() + 1);

        const sabRequest = await sabbaticalService.createSabbaticalRequest(employee.id, {
            purpose: 'Research',
            startDate: sabStart.toISOString(),
            endDate: sabEnd.toISOString(),
            plan: 'A very detailed research plan for the next year.'
        });

        // Approve it to set history
        await sabbaticalService.approveSabbatical(sabRequest.id, approver.id, 'Approved for cooldown test');
        console.log('Sabbatical approved. History set.');

        try {
            const nextSabStart = new Date(sabEnd);
            nextSabStart.setFullYear(nextSabStart.getFullYear() + 2); // 2 years later (less than 7 cooldown)
            const nextSabEnd = new Date(nextSabStart);
            nextSabEnd.setFullYear(nextSabEnd.getFullYear() + 1);

            await sabbaticalService.createSabbaticalRequest(employee.id, {
                purpose: 'Too soon research',
                startDate: nextSabStart.toISOString(),
                endDate: nextSabEnd.toISOString(),
                plan: 'Another detailed research plan.'
            });
            console.error('FAIL: Managed to bypass sabbatical cooldown!');
        } catch (error: any) {
            console.log(`SUCCESS: Cooldown blocked: ${error.message}`);
        }

        // 3. Test Registration Uniqueness
        console.log('\n3. Testing Registration Uniqueness (Employee ID)...');
        try {
            await authService.register({
                employeeId: employee.employeeId, // Collision
                name: 'Imposter',
                password: 'Password123!',
                department: 'Legal',
                role: 'EMPLOYEE' as any
            });
            console.error('FAIL: Managed to register with duplicate Employee ID!');
        } catch (error: any) {
            console.log(`SUCCESS: Duplicate registration blocked: ${error.message}`);
        }

        // 4. Test Audit Timestamps
        console.log('\n4. Testing Audit Timestamps (resolvedAt)...');
        const updatedSab: any = await prisma.sabbaticalRequest.findUnique({
            where: { id: sabRequest.id }
        });
        if (updatedSab?.resolvedAt) {
            console.log(`SUCCESS: resolvedAt set on sabbatical resolution: ${updatedSab.resolvedAt}`);
        } else {
            console.error('FAIL: resolvedAt NOT set on sabbatical resolution!');
        }

        console.log('\n--- Comprehensive Verification Completed ---');

    } catch (e) {
        console.error('Verification script failed:', e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
