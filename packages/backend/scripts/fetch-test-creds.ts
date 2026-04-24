import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const bodies = await prisma.user.findMany({
        where: { role: 'CLEARANCE_BODY' },
        include: { clearanceUnit: true, campus: true }
    });

    const hrOfficers = await prisma.user.findMany({
        where: { role: 'HR_OFFICER' },
        include: { employee: true, campus: true },
        take: 5
    });

    const headHR = await prisma.user.findMany({
        where: { isHeadHR: true },
        include: { employee: true, campus: true },
        take: 5
    });

    const admins = await prisma.user.findMany({
        where: { role: 'ADMIN' },
        include: { employee: true, campus: true },
        take: 3
    });

    console.log('\n====== CLEARANCE BODIES ======');
    for (const u of bodies) {
        console.log(`Unit    : ${u.clearanceUnit?.fullName || u.clearanceUnit?.name || 'N/A'}`);
        console.log(`Login ID: ${u.employeeId}`);
        console.log(`Campus  : ${u.campus?.name || 'N/A'}`);
        console.log('---');
    }

    console.log('\n====== HR OFFICERS ======');
    for (const u of hrOfficers) {
        console.log(`Name    : ${u.employee?.name || '(no employee)'}`);
        console.log(`Login ID: ${u.employeeId}`);
        console.log(`Campus  : ${u.campus?.name || 'N/A'}`);
        console.log('---');
    }

    console.log('\n====== HEAD HR ======');
    for (const u of headHR) {
        console.log(`Name    : ${u.employee?.name || '(no employee)'}`);
        console.log(`Login ID: ${u.employeeId}`);
        console.log(`Campus  : ${u.campus?.name || 'N/A'}`);
        console.log('---');
    }

    console.log('\n====== ADMINS ======');
    for (const u of admins) {
        console.log(`Name    : ${u.employee?.name || '(no employee)'}`);
        console.log(`Login ID: ${u.employeeId}`);
        console.log('---');
    }
}
main().catch(console.error).finally(() => prisma.$disconnect());
