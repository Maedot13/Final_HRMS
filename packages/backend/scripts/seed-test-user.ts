
import { PrismaClient, UserRole, SalaryType } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
    const employeeId = 'EMP_TESTER';
    const password = 'password123';
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    try {
        // 1. Create User
        const user = await prisma.user.upsert({
            where: { employeeId },
            update: { passwordHash: passwordHash },
            create: {
                employeeId,
                passwordHash,
                role: UserRole.EMPLOYEE,
            }
        });

        // 2. Create Employee with 10 years service
        await prisma.employee.upsert({
            where: { employeeId },
            update: { serviceYears: 10 },
            create: {
                employeeId,
                userId: user.id,
                name: 'Qualified Tester',
                department: 'Engineering',
                position: 'Senior Developer',
                hireDate: new Date('2014-01-01'),
                serviceYears: 10,
                contactInfo: { email: 'tester@example.com' },
                grossSalary: 5000,
                salaryType: SalaryType.MONTHLY
            }
        });

        console.log('✅ Test User Created Successfully!');
        console.log('Credentials:');
        console.log('  Employee ID: EMP_TESTER');
        console.log('  Password:    password123');
        console.log('  Service Years: 10 (Qualified for Sabbatical)');
    } catch (error) {
        console.error('Error seeding test user:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
