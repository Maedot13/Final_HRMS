import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const user = await prisma.user.findUnique({
        where: { employeeId: 'EMP0047' },
        include: { employee: true }
    });

    if (!user) {
        console.log("USER_NOT_FOUND");
    } else {
        console.log(JSON.stringify({
            employeeId: user.employeeId,
            isActive: user.isActive,
            role: user.role,
            name: user.employee?.name
        }, null, 2));
    }
}

main().catch(console.error).finally(() => prisma.$disconnect());
