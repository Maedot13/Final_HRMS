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
        const users = await prisma.user.findMany({
            select: { employeeId: true, role: true, email: true }
        });
        console.log("Users in DB:", users);
        const u = await prisma.user.findUnique({
            where: { employeeId: 'AAU-AC-001' }
        });
        console.log("AAU-AC-001:", u);
    } catch(err) {
        console.error("Error:", err);
    } finally {
        await prisma.$disconnect();
    }
}
main();
