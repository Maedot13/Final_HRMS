
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const units = [
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

    for (const unit of units) {
        await prisma.clearanceUnit.upsert({
            where: { name: unit.name },
            update: {},
            create: unit
        });
    }

    console.log(`✅ Seeded ${units.length} clearance units.`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
