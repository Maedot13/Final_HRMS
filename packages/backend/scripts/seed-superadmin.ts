import { UserRole, UserScope, SalaryType } from '@prisma/client';
import bcrypt from 'bcrypt';
import { prisma } from '../src/lib/prisma';

async function main() {
    const employeeId = 'sup0001';
    const email = 'superadmin@example.com';
    const password = 'password123';
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    try {
        console.log('Seeding superadmin...');
        
        // 1. Create User
        const user = await prisma.user.upsert({
            where: { employeeId },
            update: { 
                passwordHash,
                role: UserRole.SUPER_ADMIN,
                scope: UserScope.UNIVERSITY,
                email,
                isHeadHR: true // giving headHR privileges just in case
            },
            create: {
                employeeId,
                email,
                passwordHash,
                role: UserRole.SUPER_ADMIN,
                scope: UserScope.UNIVERSITY,
                isHeadHR: true
            }
        });

        // 2. Create Employee
        await prisma.employee.upsert({
            where: { employeeId },
            update: { },
            create: {
                employeeId,
                userId: user.id,
                name: 'System Super Admin',
                deptLegacy: 'Administration',
                position: 'Super Administrator',
                hireDate: new Date(),
                serviceYears: 0,
                contactInfo: { email },
                grossSalary: 0,
                salaryType: SalaryType.MONTHLY
            }
        });

        console.log('✅ Super Admin User Created Successfully!');
        console.log('Credentials:');
        console.log(`  Employee ID (or Email): ${employeeId} / ${email}`);
        console.log(`  Password:    ${password}`);
        console.log(`  Role:        ${UserRole.SUPER_ADMIN}`);
        console.log(`  Scope:       ${UserScope.UNIVERSITY}`);
    } catch (error) {
        console.error('Error seeding superadmin user:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
