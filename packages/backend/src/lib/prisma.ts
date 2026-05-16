/* eslint-disable @typescript-eslint/no-require-imports */
import { PrismaClient } from '@prisma/client';
import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';

// Use require() to avoid CJS/ESM interop issue with ts-node-dev
const { PrismaNeon } = require('@prisma/adapter-neon') as typeof import('@prisma/adapter-neon');

// Route Postgres traffic over WebSockets (port 443) instead of raw TCP (port 5432).
// This is required on networks that block outbound port 5432.
neonConfig.webSocketConstructor = ws;

const globalForPrisma = global as unknown as { prisma: PrismaClient };

function createPrismaClient() {
    const connectionString = process.env.DATABASE_URL!;
    const pool = new Pool({ connectionString });
    const adapter = new PrismaNeon(pool);
    return new PrismaClient({
        adapter,
        log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
    });
}

export const prisma = globalForPrisma.prisma || createPrismaClient();

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
