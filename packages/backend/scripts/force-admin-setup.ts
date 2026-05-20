import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
    console.log('Fusing EMP_ADMIN with Global University Privileges...');
    
    const employeeId = 'EMP_ADMIN';
    const password = 'Admin@123';
    const hash = await bcrypt.hash(password, 10);

    const user = await prisma.user.findUnique({ where: { employeeId } });

    if (!user) {
        console.log('EMP_ADMIN not found. Creating from scratch...');
        await prisma.user.create({
            data: {
                employeeId,
                email: 'superadmin@hrms.university.edu',
                passwordHash: hash,
                role: 'ADMIN' as any,
                scope: 'UNIVERSITY' as any,
                isActive: true,
                mustChangePassword: false
            }
        });
    } else {
        await prisma.user.update({
            where: { id: user.id },
            data: {
                role: 'ADMIN' as any,
                scope: 'UNIVERSITY' as any,
                passwordHash: hash,
                isActive: true,
                mustChangePassword: false
            }
        });
    }

    console.log(`\n✅ REPAIR SUCCESSFUL!`);
    console.log(`Account: ${employeeId}`);
    console.log(`Role: ADMIN`);
    console.log(`Scope: UNIVERSITY (Global)`);
    console.log(`Password: ${password}\n`);
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
