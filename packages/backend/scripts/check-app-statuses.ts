import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const apps = await prisma.jobApplication.findMany({
        include: { employee: true, jobPosting: true }
    });

    console.log(`Found ${apps.length} applications in the database:`);
    apps.forEach(app => {
        console.log(`- ID: ${app.id}, Applicant: ${app.employee.name}, Job: ${app.jobPosting.title}, Status: ${app.status}`);
    });
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
