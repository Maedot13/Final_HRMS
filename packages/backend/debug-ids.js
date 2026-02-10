
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
    try {
        const employees = await prisma.employee.findMany({
            select: {
                id: true,
                employeeId: true,
                name: true
            }
        });
        const requests = await prisma.leaveRequest.findMany({
            select: {
                id: true,
                employeeId: true,
                status: true,
                leaveType: true
            }
        });

        console.log('--- DATABASE SNAPSHOT ---');
        console.log('EMPLOYEES (Who can apply):');
        employees.forEach(e => console.log(`  ID: ${e.id} | Label: ${e.name} (${e.employeeId})`));

        console.log('\nLEAVE REQUESTS (What you approve):');
        if (requests.length === 0) {
            console.log('  (No requests found)');
        } else {
            requests.forEach(r => console.log(`  ID: ${r.id} | Applied by Employee ID: ${r.employeeId} | Status: ${r.status}`));
        }
    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        await prisma.$disconnect();
    }
}

check();
