import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const admin = await prisma.user.findFirst({
        where: { employeeId: 'EMP_ADMIN' }
    });
    console.log('EMP_ADMIN role:', admin?.role);
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
