import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    await prisma.$executeRawUnsafe(`DELETE FROM "JobPosting";`);
    await prisma.$executeRawUnsafe(`DELETE FROM "PayrollTransfer";`);
    console.log('Cleared conflicting rows.');
}

main().catch(console.error).finally(() => prisma.$disconnect());
