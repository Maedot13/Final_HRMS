import { PrismaClient, UserRole } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
    console.log('Ensuring Campus Admin exists...');
    
    const campus = await prisma.campus.findFirst({ where: { code: 'MAIN' } });
    if (!campus) {
        console.error("Main campus not found. Please run base seeds first.");
        return;
    }

    const employeeId = 'ADMIN_CAMPUS_1';
    const password = 'Admin@123';
    const hash = await bcrypt.hash(password, 10);

    // Upsert the user
    const user = await prisma.user.upsert({
        where: { employeeId },
        update: { 
            scope: 'CAMPUS', 
            role: UserRole.ADMIN, 
            passwordHash: hash,
            isActive: true 
        },
        create: {
            employeeId,
            email: 'campusadmin1@hrms.edu',
            passwordHash: hash,
            role: UserRole.ADMIN,
            scope: 'CAMPUS',
            campusId: campus.id,
            isActive: true
        }
    });

    // Ensure they have an employee record as well
    await prisma.employee.upsert({
        where: { employeeId },
        update: { campusId: campus.id },
        create: {
            userId: user.id,
            employeeId,
            name: 'Main Campus Admin',
            deptLegacy: 'Administration',
            position: 'Campus Administrator',
            hireDate: new Date(),
            campusId: campus.id,
            contactInfo: {}
        }
    });

    console.log(`\n✅ Campus Admin ready!`);
    console.log(`   ID: ${employeeId}`);
    console.log(`   Pass: ${password}`);
    console.log(`   Scope: CAMPUS (Main Campus)\n`);
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
