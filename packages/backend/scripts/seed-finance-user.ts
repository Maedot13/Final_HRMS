/**
 * Creates a Finance Officer test account.
 * Login: EMP_FINANCE / FinanceOfficer123!
 */
import { PrismaClient, UserRole, SalaryType } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
    const campus = await prisma.campus.findFirst({ where: { isActive: true } });
    if (!campus) throw new Error('No active campus found');

    const password = 'FinanceOfficer123!';
    const hash = await bcrypt.hash(password, 10);

    const existing = await prisma.user.findUnique({ where: { employeeId: 'EMP_FINANCE' } });

    if (existing) {
        await prisma.user.update({
            where: { id: existing.id },
            data: { passwordHash: hash, role: UserRole.FINANCE_OFFICER, mustChangePassword: false, campusId: campus.id, isActive: true },
        });
        console.log(`Updated EMP_FINANCE → ${password}`);
    } else {
        const user = await prisma.user.create({
            data: {
                email: 'finance@test.bdu.edu.et',
                passwordHash: hash,
                role: UserRole.FINANCE_OFFICER,
                scope: 'CAMPUS',
                campusId: campus.id,
                employeeId: 'EMP_FINANCE',
                mustChangePassword: false,
            },
        });
        await prisma.employee.create({
            data: {
                userId: user.id,
                employeeId: 'EMP_FINANCE',
                name: 'Finance Officer Test',
                deptLegacy: 'Finance',
                position: 'Finance Officer',
                hireDate: new Date('2020-01-01'),
                serviceYears: 5,
                grossSalary: 20000,
                salaryType: SalaryType.MONTHLY,
                contactInfo: {},
                campusId: campus.id,
            },
        });
        console.log(`Created EMP_FINANCE → ${password} (campus: ${campus.name})`);
    }
}

main().catch(console.error).finally(() => prisma.$disconnect());
