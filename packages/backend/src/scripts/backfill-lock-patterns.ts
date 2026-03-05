import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function backfillLockPatterns() {
    console.log('Starting backfill of isPatternLocked for campuses with employees...');

    try {
        // Find all campuses that have at least one employee
        const campusesWithEmployees = await prisma.campus.findMany({
            where: {
                employees: {
                    some: {}
                }
            },
            select: {
                id: true,
                name: true,
                code: true
            }
        });

        console.log(`Found ${campusesWithEmployees.length} campuses with employees.`);

        let updatedCount = 0;
        for (const campus of campusesWithEmployees) {
            await prisma.campus.update({
                where: { id: campus.id },
                data: { isPatternLocked: true }
            });
            console.log(`Locked pattern for campus: ${campus.name} (${campus.code})`);
            updatedCount++;
        }

        console.log(`Backfill completed. ${updatedCount} campuses updated.`);
    } catch (error) {
        console.error('Error during backfill:', error);
    } finally {
        await prisma.$disconnect();
    }
}

if (require.main === module) {
    backfillLockPatterns().then(() => process.exit(0)).catch(() => process.exit(1));
}

export { backfillLockPatterns };
