import { PrismaClient } from '@prisma/client';

const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma =
    globalForPrisma.prisma ||
    new PrismaClient({
        log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
        datasources: {
            db: {
                url: process.env.DATABASE_URL,
            },
        },
    });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

// Keep-alive ping every 4 minutes to prevent Neon cold starts
// Neon pauses after ~5 min of inactivity on the free tier
const KEEP_ALIVE_INTERVAL_MS = 4 * 60 * 1000;
setInterval(async () => {
    try {
        await prisma.$queryRaw`SELECT 1`;
    } catch {
        // Swallow — the next real query will reconnect automatically
    }
}, KEEP_ALIVE_INTERVAL_MS);
