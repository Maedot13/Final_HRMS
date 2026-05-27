import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const twoYearsAgo = new Date();
    twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);

    const updatedEmployee = await prisma.employee.update({
        where: { employeeId: 'EMP0001' },
        data: { hireDate: twoYearsAgo }
    });
    console.log('Successfully updated EMP0001 hireDate to:', updatedEmployee.hireDate);
}

main().catch(console.error).finally(() => prisma.$disconnect());
