import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const apps = await prisma.jobApplication.findMany({
        where: { status: 'ACCEPTED' },
        select: { id: true, jobPostingId: true, employeeId: true, assignedFacultyId: true }
    });
    console.log("Accepted applications:", apps);
}

main().catch(console.error).finally(() => prisma.$disconnect());
