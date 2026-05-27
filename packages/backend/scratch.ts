import { PrismaClient, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
    const roles = [UserRole.HR_OFFICER, UserRole.RECRUITMENT_COMMITTEE, UserRole.EMPLOYEE, UserRole.ADMIN];
    const passwordHash = await bcrypt.hash('Password123!', 10);
    
    for (const role of roles) {
        let user = await prisma.user.findFirst({
            where: { role },
            include: { employee: true }
        });
        
        if (user) {
            await prisma.user.update({
                where: { id: user.id },
                data: { passwordHash }
            });
            console.log(`Role: ${role} | EmployeeId: ${user.employeeId} | Email: ${user.email} | Password: Password123!`);
        } else {
            console.log(`No user found for role: ${role}`);
        }
    }
}

main().catch(console.error).finally(() => prisma.$disconnect());
