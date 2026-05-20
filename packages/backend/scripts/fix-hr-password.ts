import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
    const employeeId = 'EMP_HR_TEST';
    const password = 'Hr@12345';
    const hash = await bcrypt.hash(password, 10);

    const user = await prisma.user.findUnique({ where: { employeeId } });
    if (!user) {
        console.error(`User ${employeeId} not found!`);
        return;
    }

    await prisma.user.update({
        where: { id: user.id },
        data: { 
            passwordHash: hash,
            isActive: true,
            mustChangePassword: false
        }
    });

    console.log(`✅ SUCCESS: Password for ${employeeId} has been reset to: ${password}`);
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
