import axios from 'axios';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    // Check if the DB has pending evaluations
    const pending = await prisma.performanceEvaluation.findMany({
        where: { status: 'PENDING_HR' },
        include: { employee: { select: { name: true, employeeId: true } } },
        orderBy: { createdAt: 'desc' }
    });
    console.log('Pending count in DB:', pending.length);
    if (pending.length > 0) {
        console.log('First pending:', pending[0]);
    }
}
main().finally(() => prisma.$disconnect());
