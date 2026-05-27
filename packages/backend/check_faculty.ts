import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const user = await prisma.user.findUnique({
        where: { employeeId: 'EMP0047' }
    });
    console.log("EMP0047 recruitmentFacultyId:", user?.recruitmentFacultyId);
}

main().catch(console.error).finally(() => prisma.$disconnect());
