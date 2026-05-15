
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Updating job application statuses...');

    // SUBMITTED -> PENDING
    const r1 = await prisma.jobApplication.updateMany({
        where: { status: 'SUBMITTED' as any },
        data: { status: 'PENDING' as any }
    });
    console.log(`Updated ${r1.count} SUBMITTED -> PENDING`);

    // UNDER_REVIEW -> PENDING (Assuming they haven't passed HR screening yet in the new flow)
    const r2 = await prisma.jobApplication.updateMany({
        where: { status: 'UNDER_REVIEW' as any },
        data: { status: 'PENDING' as any }
    });
    console.log(`Updated ${r2.count} UNDER_REVIEW -> PENDING`);

    // SHORTLISTED -> RECOMMENDED
    const r3 = await prisma.jobApplication.updateMany({
        where: { status: 'SHORTLISTED' as any },
        data: { status: 'RECOMMENDED' as any }
    });
    console.log(`Updated ${r3.count} SHORTLISTED -> RECOMMENDED`);

    // SELECTED -> HIRED
    const r4 = await prisma.jobApplication.updateMany({
        where: { status: 'SELECTED' as any },
        data: { status: 'HIRED' as any }
    });
    console.log(`Updated ${r4.count} SELECTED -> HIRED`);

    console.log('Done.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
