import { Prisma, PrismaClient } from '@prisma/client';

export async function generateNextEmployeeId(campusId: number, tx: Omit<PrismaClient, "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends">): Promise<string> {
    // Obtain a transaction-level advisory lock to serialize ID generation globally
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(1001)`;

    // Find the maximum numeric part of any existing employee ID that matches 'EMPXXXX'
    const result = await tx.$queryRaw<{ max_id: number }[]>`
        SELECT COALESCE(MAX(CAST(SUBSTRING("employeeId" FROM 4) AS INTEGER)), 0) as max_id
        FROM "User"
        WHERE "employeeId" ~ '^EMP[0-9]+$'
    `;

    const nextSeq = Number(result[0].max_id) + 1;
    
    // Pad with zeros to at least 4 digits
    const paddedSequence = nextSeq.toString().padStart(4, '0');

    return `EMP${paddedSequence}`;
}
