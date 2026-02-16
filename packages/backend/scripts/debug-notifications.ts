
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkDepartmentHeads() {
    console.log('--- Debugging Department Heads ---');

    // 1. List all employees to see their departments
    const employees = await prisma.employee.findMany({
        select: {
            userId: true,
            name: true,
            department: true,
            position: true
        }
    });

    console.log(`Found ${employees.length} employees.`);
    employees.forEach(e => console.log(`- ${e.name} (${e.userId}): Dept='${e.department}', Pos='${e.position}'`));

    // 2. List all users with DEPARTMENT_HEAD role
    const heads = await prisma.user.findMany({
        where: { role: 'DEPARTMENT_HEAD' },
        include: { employee: true }
    });

    console.log(`\nFound ${heads.length} users with role 'DEPARTMENT_HEAD'.`);
    heads.forEach(h => {
        if (h.employee) {
            console.log(`- UserID ${h.id} (${h.employee.name}): Dept='${h.employee.department}'`);
        } else {
            console.log(`- UserID ${h.id}: NO EMPLOYEE PROFILE LINKED`);
        }
    });

    // 3. Test the exact query used in notification.service.ts
    const testDepartment = 'Engineering'; // Replace with the department you are testing
    console.log(`\nTesting query for department: '${testDepartment}'`);

    const foundHeads = await prisma.employee.findMany({
        where: {
            department: testDepartment,
            user: {
                role: 'DEPARTMENT_HEAD',
                isActive: true
            }
        },
        select: { userId: true }
    });

    console.log(`Query found ${foundHeads.length} heads for '${testDepartment}':`, foundHeads);
}

checkDepartmentHeads()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
