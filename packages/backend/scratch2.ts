import { PrismaClient, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
    const passwordHash = await bcrypt.hash('Password123!', 10);
    
    // Check if we need to create a committee user
    let commUser = await prisma.user.findFirst({
        where: { role: UserRole.RECRUITMENT_COMMITTEE }
    });

    if (!commUser) {
        // Try to find a plain employee to promote
        let emp = await prisma.employee.findFirst({
            where: { user: { role: UserRole.EMPLOYEE } }
        });

        if (emp) {
            commUser = await prisma.user.update({
                where: { id: emp.userId },
                data: { role: UserRole.RECRUITMENT_COMMITTEE, passwordHash }
            });
            console.log(`Promoted existing employee ${emp.employeeId} to RECRUITMENT_COMMITTEE`);
            console.log(`Role: RECRUITMENT_COMMITTEE | EmployeeId: ${commUser.employeeId} | Email: ${commUser.email} | Password: Password123!`);
        }
    }
}

main().catch(console.error).finally(() => prisma.$disconnect());
