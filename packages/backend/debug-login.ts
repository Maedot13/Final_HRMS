import { PrismaClient } from '@prisma/client';
import { comparePassword } from './src/utils/password';

const prisma = new PrismaClient();

async function checkUser(employeeId: string, plainTextPass: string) {
    const user = await prisma.user.findUnique({ where: { employeeId } });
    if (!user) {
        console.log(`User ${employeeId} not found`);
        return;
    }
    console.log(`User ${employeeId} found. isActive: ${user.isActive}`);
    const isMatch = await comparePassword(plainTextPass, user.passwordHash);
    console.log(`Password match for ${plainTextPass}? ${isMatch}`);
}

async function main() {
    await checkUser('EMP_HR_TEST', 'password123');
    await checkUser('EMP0001', 'password123');
}

main().finally(() => prisma.$disconnect());
