import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
    const employeeId = 'EMP_ADMIN';
    const newPassword = 'Admin@123';
    
    console.log(`Searching for user with Employee ID: ${employeeId}...`);
    
    const user = await prisma.user.findUnique({
        where: { employeeId },
        include: { employee: true }
    });
    
    if (!user) {
        console.error(`ERROR: User ${employeeId} not found!`);
        return;
    }
    
    console.log(`User found: ID=${user.id}, Role=${user.role}, Scope=${user.scope}, Active=${user.isActive}`);
    
    const passwordHash = await bcrypt.hash(newPassword, 10);
    
    await prisma.user.update({
        where: { id: user.id },
        data: {
            passwordHash,
            mustChangePassword: false,
            isActive: true
        }
    });
    
    console.log(`SUCCESS: Password for ${employeeId} has been reset to: ${newPassword}`);
    console.log(`Please use ${employeeId} and ${newPassword} to login.`);
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
