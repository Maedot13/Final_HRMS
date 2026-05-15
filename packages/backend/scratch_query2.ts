import { PrismaClient } from '@prisma/client';
import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { PrismaNeon } = require('@prisma/adapter-neon');

neonConfig.webSocketConstructor = ws;

const connectionString = process.env.DATABASE_URL!;
const pool = new Pool({ connectionString });
const adapter = new PrismaNeon(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
    try {
        const u = await prisma.user.findUnique({
            where: { employeeId: 'AAU-AC-001' },
            include: { employee: true, campus: true, clearanceUnit: true }
        });
        console.log("AAU-AC-001 with includes:", u);
    } catch(err) {
        console.error("Error:", err);
    } finally {
        await prisma.$disconnect();
    }
}
main();
