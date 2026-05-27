import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const updatedUser = await prisma.user.update({
        where: { employeeId: 'EMP0001' },
        data: { isHeadHR: false }
    });
    console.log('Successfully updated EMP0001 to normal employee (isHeadHR = false).', updatedUser);
}

main().catch(console.error).finally(() => prisma.$disconnect());
