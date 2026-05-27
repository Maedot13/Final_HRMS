import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    await prisma.user.update({
        where: { employeeId: 'EMP0047' },
        data: { campusId: 1 }
    });
    
    await prisma.employee.update({
        where: { employeeId: 'EMP0047' },
        data: { campusId: 1 }
    });
    
    console.log("Moved EMP0047 to campusId: 1");
}

main().catch(console.error).finally(() => prisma.$disconnect());
