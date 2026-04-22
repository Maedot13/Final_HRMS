import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
    const user = await prisma.user.findUnique({ where: { employeeId: 'IT-01' } });
    console.log("User:", user);
    if (user) {
        const isMatch = await bcrypt.compare('ITPass123!', user.passwordHash);
        console.log("Password matches:", isMatch);
    }
}
main().finally(() => prisma.$disconnect());
