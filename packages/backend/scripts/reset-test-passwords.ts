import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const accounts = [
    // Clearance Bodies — use the new loginId-based ones
    { employeeId: 'LIB-01', newPassword: 'LibraryPass123!' },
    { employeeId: 'SPO-01', newPassword: 'SportPass123!' },
    { employeeId: 'IT-01',  newPassword: 'ITPass123!' },
    // HR Officer
    { employeeId: 'EMP_HR_TEST', newPassword: 'HrOfficer123!' },
    // Head HR
    { employeeId: 'EMP0001', newPassword: 'HeadHR123!' },
    // Admin
    { employeeId: 'EMP_ADMIN', newPassword: 'Admin123!' },
];

async function main() {
    for (const acc of accounts) {
        const hash = await bcrypt.hash(acc.newPassword, 10);
        const updated = await prisma.user.updateMany({
            where: { employeeId: acc.employeeId },
            data: { passwordHash: hash, mustChangePassword: false }
        });
        console.log(`${acc.employeeId}: ${updated.count ? 'updated' : 'NOT FOUND'} → ${acc.newPassword}`);
    }
}
main().catch(console.error).finally(() => prisma.$disconnect());
