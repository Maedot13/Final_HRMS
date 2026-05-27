import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
const prisma = new PrismaClient();

async function main() {
    const passwordHash = await bcrypt.hash('Password123!', 10);
    const twoYearsAgo = new Date();
    twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);

    // Find an employee in campus 1
    const empUser = await prisma.user.findFirst({
        where: {
            role: 'EMPLOYEE',
            campusId: 1
        },
        include: { employee: true }
    });

    if (empUser) {
        await prisma.user.update({
            where: { id: empUser.id },
            data: { passwordHash, isHeadHR: false }
        });
        
        if (empUser.employee) {
            await prisma.employee.update({
                where: { id: empUser.employee.id },
                data: { hireDate: twoYearsAgo }
            });
        }
        
        console.log(`Found Employee:`);
        console.log(`Employee ID: ${empUser.employeeId}`);
        console.log(`Email: ${empUser.email}`);
        console.log(`Name: ${empUser.employee?.name}`);
    } else {
        console.log('No employee found in Campus 1.');
    }
}

main().catch(console.error).finally(() => prisma.$disconnect());
