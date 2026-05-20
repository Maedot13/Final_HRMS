import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
    try {
        const campuses = await prisma.campus.findMany();
        console.log('Campuses:', JSON.stringify(campuses, null, 2));
    } catch (err) {
        console.error('Error fetching campuses:', err);
    } finally {
        await prisma.$disconnect();
    }
}
main();
