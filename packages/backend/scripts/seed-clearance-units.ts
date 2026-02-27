import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const DEFAULT_CAMPUS_CODE = 'MAIN';

const units = [
    { name: 'Department Head', description: 'Department head approval for exit' },
    { name: 'Library', description: 'Clearance for all borrowed books' },
    { name: 'IT Support', description: 'Return laptops and revoke access' },
    { name: 'Finance', description: 'Settlement of all financial dues' },
    { name: 'Housing / Dormitory', description: 'Room keys and inventory check' },
    { name: 'Sports Club', description: 'Return sports equipment' },
    { name: 'Faculty Dean', description: 'Academic clearance' },
    { name: 'Campus Police', description: 'Security badge return' },
    { name: 'Cafeteria', description: 'Settle food coupons/credit' },
    { name: 'HR', description: 'Final exit interview and file closure' }
];

async function main() {
    console.log('🌱 Seeding Clearance Units...');

    const campus = await prisma.campus.findFirst({
        where: { code: DEFAULT_CAMPUS_CODE }
    });
    if (!campus) {
        throw new Error(
            `Campus "${DEFAULT_CAMPUS_CODE}" not found. Run seed-multi-campus-backfill.ts first, or create a campus.`
        );
    }

    for (const unit of units) {
        await prisma.clearanceUnit.upsert({
            where: {
                campusId_name: { campusId: campus.id, name: unit.name }
            },
            update: {},
            create: { ...unit, campusId: campus.id }
        });
    }

    console.log(`✅ Seeded ${units.length} clearance units for campus ${campus.name}.`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
