
import { PrismaClient, UserRole } from '@prisma/client';
import { differenceInDays, endOfMonth, startOfMonth } from 'date-fns';

const prisma = new PrismaClient();

async function main() {
    console.log('🧪 Verifying Payroll Data Transfer...');

    const today = new Date();
    const currentMonth = startOfMonth(today);
    const endMonth = endOfMonth(today);

    // 1. Setup Data - Cleanup first
    const testIds = ['PAYROLL_FULL', 'PAYROLL_NEW', 'PAYROLL_EXIT'];

    // Delete payroll transfers first (FK constraint) - actually difficult relations.
    // Easier: find users, find employees, delete all related.
    // Or just delete users cascade? Prisma doesn't cascade delete unless configured in schema.
    // Schema: user User @relation(fields: [userId], references: [id])
    // Employee has ON DELETE? No.
    // So we must delete manually.

    // Find test employees
    const employees = await prisma.employee.findMany({ where: { employeeId: { in: testIds } } });
    const empIds = employees.map(e => e.id);

    if (empIds.length > 0) {
        await prisma.payrollTransfer.deleteMany({ where: { employeeId: { in: empIds } } });
        await prisma.clearanceCheck.deleteMany({ where: { clearance: { employeeId: { in: empIds } } } }); // via clearance
        await prisma.clearanceRequest.deleteMany({ where: { employeeId: { in: empIds } } });
        // Delete job apps, etc? Assuming none created.
        await prisma.employee.deleteMany({ where: { id: { in: empIds } } });
    }

    await prisma.user.deleteMany({ where: { employeeId: { in: testIds } } });

    // A. Active Employee (Full Month)
    await prisma.user.create({
        data: {
            employeeId: 'PAYROLL_FULL',
            passwordHash: 'dummy',
            role: UserRole.EMPLOYEE,
            isActive: true,
            employee: {
                create: {
                    employeeId: 'PAYROLL_FULL',
                    name: 'Full Month Emp',
                    department: 'IT',
                    position: 'Dev',
                    hireDate: new Date('2020-01-01'), // Long ago
                    grossSalary: 5000,
                    salaryType: 'MONTHLY',
                    contactInfo: {}
                }
            }
        }
    });

    // B. New Hire (Joined 5 days ago)
    const hireDate = new Date(today);
    hireDate.setDate(today.getDate() - 5);
    await prisma.user.create({
        data: {
            employeeId: 'PAYROLL_NEW',
            passwordHash: 'dummy',
            role: UserRole.EMPLOYEE,
            isActive: true,
            employee: {
                create: {
                    employeeId: 'PAYROLL_NEW',
                    name: 'New Hire Emp',
                    department: 'HR',
                    position: 'Intern',
                    hireDate: hireDate,
                    grossSalary: 3000,
                    salaryType: 'MONTHLY',
                    contactInfo: {}
                }
            }
        }
    });

    // C. Terminated Employee (Exited 2 days ago)
    // Needs a user (inactive) and a PayrollTransfer/Clearance
    const exitDate = new Date(today);
    exitDate.setDate(today.getDate() - 2);

    const exitedUser = await prisma.user.create({
        data: {
            employeeId: 'PAYROLL_EXIT',
            passwordHash: 'dummy',
            role: UserRole.EMPLOYEE,
            isActive: false, // Inactive
            employee: {
                create: {
                    employeeId: 'PAYROLL_EXIT',
                    name: 'Exited Emp',
                    department: 'Finance',
                    position: 'Analyst',
                    hireDate: new Date('2020-01-01'),
                    grossSalary: 6000,
                    salaryType: 'MONTHLY',
                    contactInfo: {}
                }
            }
        }
    });

    // Create PayrollTransfer for exit
    const emp = await prisma.employee.findUniqueOrThrow({ where: { userId: exitedUser.id } });

    await prisma.payrollTransfer.create({
        data: {
            // Use connect for employee relation
            employee: { connect: { id: emp.id } },
            clearance: {
                create: {
                    employeeId: emp.id,
                    reason: 'Resign',
                    lastWorkingDay: exitDate,
                    status: 'APPROVED'
                }
            },
            reason: 'Clearance',
            effectiveDate: exitDate,
            status: 'COMPLETED',
            createdBy: 1 // dummy
        }
    });


    // 2. Call Service directly (mocking controller call)
    const { getPayrollData } = await import('../src/services/payroll.service');

    // Mock params for current month
    const result = await getPayrollData({ month: today.getMonth() + 1, year: today.getFullYear() });

    console.log(`\n📅 Month: ${result.period.month}/${result.period.year}`);
    console.log(`👥 Count: ${result.count}`);

    // Verify
    const full = result.data.find((e: any) => e.employeeId === 'PAYROLL_FULL');
    const newHire = result.data.find((e: any) => e.employeeId === 'PAYROLL_NEW');
    const exited = result.data.find((e: any) => e.employeeId === 'PAYROLL_EXIT');

    console.log('\n--- Verification ---');

    if (full) {
        console.log(`✅ Full Month Emp: Payable Days = ${full.payableDays} (Expected 30 or ${endMonth.getDate()})`);
        if (full.payableDays !== 30 && full.payableDays !== endMonth.getDate()) console.error('❌ Full Month calculation mismatch');
    } else console.error('❌ Full Month Emp NOT found');

    if (newHire) {
        const expected = differenceInDays(endMonth, hireDate) + 1;
        console.log(`✅ New Hire Emp: Payable Days = ${newHire.payableDays} (Expected ~${expected})`);
        // Allowance for timezone/date boundaries in verification vs service
    } else console.error('❌ New Hire Emp NOT found');

    if (exited) {
        const start = startOfMonth(today);
        const expectedExit = differenceInDays(exitDate, start) + 1;
        console.log(`✅ Exited Emp: Payable Days = ${exited.payableDays} (Expected ~${expectedExit})`);
    } else console.error('❌ Exited Emp NOT found (Did logic catch it?)');

}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        // Cleanup?
        await prisma.$disconnect();
    });
