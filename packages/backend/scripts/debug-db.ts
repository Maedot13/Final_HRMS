import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
    try {
        const campuses = await prisma.campus.findMany();
        console.log('--- Campus Table ---');
        console.log(JSON.stringify(campuses, null, 2));
        
        const users = await prisma.user.findMany();
        console.log('--- User Table ---');
        console.log(JSON.stringify(users, null, 2));
    } catch (err) {
        console.error('Database Error:', err);
    } finally {
        await prisma.$disconnect();
    }
}
main();
