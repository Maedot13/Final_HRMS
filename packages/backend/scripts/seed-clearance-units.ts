import { prisma } from '../src/lib/prisma';

const units = [
    { name: 'Library', description: 'Clearance for all borrowed books' },
    { name: 'IT', description: 'Return laptops and revoke access' },
    { name: 'Store', description: 'Clearance from the store department' },
    { name: 'Lab', description: 'Lab equipment clearance' }
];

async function main() {
    console.log('🌱 Seeding Clearance Units...');

    const campuses = await prisma.campus.findMany({
        where: { code: { in: ['POLY', 'PEDA'] } }
    });
    
    if (campuses.length === 0) {
        console.log('Campuses POLY and PEDA not found, creating them...');
        const poly = await prisma.campus.create({ data: { code: 'POLY', name: 'Poly Campus', isActive: true } });
        const peda = await prisma.campus.create({ data: { code: 'PEDA', name: 'Peda Campus', isActive: true } });
        campuses.push(poly, peda);
    }

    for (const campus of campuses) {
        for (const unit of units) {
            await prisma.clearanceUnit.upsert({
                where: {
                    campusId_name: { campusId: campus.id, name: unit.name }
                },
                update: { description: unit.description, isActive: true },
                create: { ...unit, campusId: campus.id }
            });
        }
    }

    console.log(`✅ Seeded ${units.length} clearance units for each campus.`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
