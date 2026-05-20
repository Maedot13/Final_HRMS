import { prisma } from '../src/lib/prisma';

async function main() {
    try {
        await prisma.$executeRawUnsafe(`ALTER TABLE "PayrollTransfer" ALTER COLUMN "clearanceId" DROP NOT NULL;`);
        console.log("Dropped NOT NULL constraint on clearanceId");
    } catch (e) {
        console.log("Error or already nullable:", e);
    }
}

main().catch(console.error).finally(() => prisma.$disconnect());
