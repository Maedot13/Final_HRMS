import { prisma } from '../src/lib/prisma';

async function main() {
    try {
        await prisma.$executeRawUnsafe(`ALTER TABLE "PayrollTransfer" ADD COLUMN "salaryInfo" TEXT;`);
        console.log("Added column salaryInfo");
    } catch (e) {
        console.log("Column may already exist or error:", e);
    }
}

main().catch(console.error).finally(() => prisma.$disconnect());
