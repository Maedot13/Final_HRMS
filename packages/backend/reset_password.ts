import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
    const newPassword = 'Password@123';
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    const user = await prisma.user.update({
        where: { employeeId: 'EMP0047' },
        data: { passwordHash: hashedPassword }
    });
    console.log(`Password for ${user.employeeId} reset to: ${newPassword}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
