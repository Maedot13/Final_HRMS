import { prisma } from '../src/lib/prisma';
import { UserRole } from '@prisma/client';

async function main() {
    await prisma.user.updateMany({
        where: {
            email: {
                in: ['eskinder.vp@example.com', 'dawit.dean@example.com']
            }
        },
        data: {
            role: UserRole.EMPLOYEE
        }
    });
    console.log("Roles updated to EMPLOYEE successfully.");
}

main().catch(console.error).finally(() => prisma.$disconnect());
