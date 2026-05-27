import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const jobs = await prisma.jobPosting.findMany({
        where: { id: 4 }
    });
    console.log("Job Postings:", jobs);
}

main().catch(console.error).finally(() => prisma.$disconnect());
