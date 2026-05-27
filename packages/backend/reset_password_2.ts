import { PrismaClient } from '@prisma/client';
import { hashPassword, comparePassword } from './src/utils/password';

const prisma = new PrismaClient();

async function main() {
    const rawPass = 'Password@123';
    const hashed = await hashPassword(rawPass);
    
    // Test right away
    const works = await comparePassword(rawPass, hashed);
    console.log("Before save works:", works);
    
    const user = await prisma.user.update({
        where: { employeeId: 'EMP0047' },
        data: { passwordHash: hashed }
    });
    
    const doubleCheck = await comparePassword(rawPass, user.passwordHash);
    console.log(`Password reset for ${user.employeeId}. Double check:`, doubleCheck);
}

main().catch(console.error).finally(() => prisma.$disconnect());
