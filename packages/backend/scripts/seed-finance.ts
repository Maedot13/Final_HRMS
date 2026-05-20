import { PrismaClient, UserRole, SalaryType } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
    const campus = await prisma.campus.findFirst({ where: { isActive: true } });
    if (!campus) throw new Error('No active campus found in the database. Please run backfill scripts first.');

    const passwordHash = await bcrypt.hash('password123', 10);
    const acc = {
        employeeId: 'EMP_FINANCE_TEST',
        email: 'finance@test.bdu.edu.et',
        name: 'Finance Officer Test',
        department: 'Finance',
        position: 'Finance Officer',
        role: UserRole.FINANCE_OFFICER,
    };

    const user = await prisma.user.upsert({
        where: { email: acc.email },
        update: { passwordHash, role: acc.role },
        create: {
            email: acc.email,
            passwordHash,
            role: acc.role,
            scope: 'CAMPUS',
            campusId: campus.id,
            employeeId: acc.employeeId,
            employee: {
                create: {
                    employeeId: acc.employeeId,
                    name: acc.name,
                    deptLegacy: acc.department,
                    position: acc.position,
                    hireDate: new Date(),
                    serviceYears: 2,
                    grossSalary: 20000,
                    salaryType: SalaryType.MONTHLY,
                    contactInfo: {},
                    campusId: campus.id,
                }
            }
        }
    });

    console.log('✅ Finance user ready: finance@test.bdu.edu.et / password123');
}

main().finally(() => prisma.$disconnect());
