import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
    const users = await prisma.user.findMany({
        where: { scope: 'UNIVERSITY' }
    });
    console.log('--- Users with UNIVERSITY Scope ---');
    users.forEach(u => {
        console.log(`EmployeeID: ${u.employeeId}, Role: ${u.role}, Scope: ${u.scope}, Active: ${u.isActive}`);
    });
    
    if (users.length === 0) {
        console.log('No university-scoped users found. Attempting to promote EMP_ADMIN...');
        const admin = await prisma.user.findUnique({ where: { employeeId: 'EMP_ADMIN' } });
        if (admin) {
            await prisma.user.update({
                where: { id: admin.id },
                data: { scope: 'UNIVERSITY' }
            });
            console.log('EMP_ADMIN has been promoted to UNIVERSITY scope.');
        } else {
            console.log('EMP_ADMIN not found.');
        }
    }
}
main().finally(() => prisma.$disconnect());
