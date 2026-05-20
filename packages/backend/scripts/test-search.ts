import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
    console.log('Testing search for EMP_REGULAR');
    const search = 'EMP_REGULAR';
    const emps = await prisma.employee.findMany({
        where: {
            OR: [
                { name: { contains: search, mode: 'insensitive' } },
                { employeeId: { contains: search, mode: 'insensitive' } },
            ]
        }
    });
    console.log('Results:', emps);
    await prisma.$disconnect();
}
main();
