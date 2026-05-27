import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const updatedUser = await prisma.user.update({
        where: { employeeId: 'EMP0013' },
        data: { campusId: 1 }
    });
    console.log('Updated EMP0013 to campusId: 1', updatedUser.campusId);
}

main().catch(console.error).finally(() => prisma.$disconnect());
