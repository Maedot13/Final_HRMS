import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
    const user = await prisma.user.findUnique({ where: { employeeId: 'EMP0047' } });
    if (!user) {
        console.log("No user");
        return;
    }
    const isMatch = await bcrypt.compare('Password@123', user.passwordHash);
    console.log("Match:", isMatch);
    console.log("Hash:", user.passwordHash);
}

main().catch(console.error).finally(() => prisma.$disconnect());
