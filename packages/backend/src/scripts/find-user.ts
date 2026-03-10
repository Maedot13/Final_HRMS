import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const employeeId = 'PEDA-001';
    const user = await prisma.user.findUnique({
        where: { employeeId },
        select: { id: true, email: true, role: true, mustChangePassword: true }
    });

    if (user) {
        console.log('User found:');
        console.log(JSON.stringify(user, null, 2));
    } else {
        console.log('User with employeeId ' + employeeId + ' not found.');
    }
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
