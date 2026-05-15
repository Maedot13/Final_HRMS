import { prisma } from '../src/lib/prisma';

async function main() {
    try {
        await prisma.$executeRawUnsafe(`ALTER TABLE "PayrollTransfer" ADD COLUMN "leaveId" INTEGER;`);
        console.log("Added column leaveId");
    } catch (e) {
        console.log("Column may already exist or error:", e);
    }
    
    try {
        await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX "PayrollTransfer_leaveId_key" ON "PayrollTransfer"("leaveId");`);
        console.log("Added unique index");
    } catch (e) {
        console.log("Index may already exist or error:", e);
    }

    try {
        await prisma.$executeRawUnsafe(`ALTER TABLE "PayrollTransfer" ADD CONSTRAINT "PayrollTransfer_leaveId_fkey" FOREIGN KEY ("leaveId") REFERENCES "LeaveRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;`);
        console.log("Added foreign key constraint");
    } catch (e) {
        console.log("FK may already exist or error:", e);
    }
}

main().catch(console.error).finally(() => prisma.$disconnect());
