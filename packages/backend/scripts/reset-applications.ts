import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const apps = await prisma.jobApplication.findMany();
    
    if (apps.length > 0) {
        for (const app of apps) {
            await prisma.jobApplication.update({
                where: { id: app.id },
                data: {
                    status: 'PENDING',
                    examScore: null,
                    interviewScore: null,
                    recommendation: null,
                }
            });
            console.log(`Reset Application ID ${app.id} to PENDING.`);
        }
    } else {
        console.log('No applications found to reset.');
    }
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
