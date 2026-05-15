import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const jobs = await prisma.jobPosting.findMany({
        include: {
            _count: {
                select: { 
                    applications: {
                        where: { status: 'HIRED' }
                    }
                }
            }
        }
    });

    console.log('Active Jobs and Vacancies:');
    jobs.forEach(job => {
        console.log(`- ID: ${job.id}, Title: ${job.title}, Status: ${job.status}, Vacancies: ${job.vacancies}, Hired: ${job._count.applications}`);
    });
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
