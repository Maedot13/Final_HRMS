import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const users = await prisma.user.findMany({
        where: { role: 'RECRUITMENT_COMMITTEE' },
        include: { employee: true }
    });

    if (users.length > 0) {
        console.log('--- Recruitment Committee Users ---');
        users.forEach(u => {
            console.log(`Name: ${u.employee?.name}`);
            console.log(`Username (Employee ID): ${u.employeeId}`);
        });
    } else {
        console.log('No Recruitment Committee users found.');
        
        // See if there's an admin
        const admin = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
        console.log('\nYou can log in as Admin and create one:');
        console.log(`Admin Username: ${admin?.employeeId}`);
    }
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
