import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
    const user = await prisma.user.findUnique({
        where: { employeeId: 'EMP_DEPT_HEAD' },
        include: { employee: true }
    });
    console.log(user ? 'User exists' : 'User missing');
    if (user) console.log(`Campus ID: ${user.campusId}, Employee profile: ${user.employee ? 'Yes' : 'No'}`);
    await prisma.$disconnect();
}
main();
