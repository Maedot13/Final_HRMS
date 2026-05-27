import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const faculty = await prisma.faculty.findUnique({
        where: { id: 2 },
        include: { college: true }
    });
    console.log("Faculty 2:", JSON.stringify(faculty, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
