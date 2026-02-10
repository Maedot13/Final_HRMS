
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
    try {
        const count = await prisma.leaveRequest.count();
        const requests = await prisma.leaveRequest.findMany({
            take: 10,
            include: {
                employee: {
                    select: {
                        name: true,
                        employeeId: true
                    }
                }
            }
        });
        console.log('--- LEAVE REQUESTS STATUS ---');
        console.log('Total Leave Requests:', count);
        if (count > 0) {
            console.log('Details (use the "id" in your URL):');
            requests.forEach(r => {
                console.log(`ID: ${r.id} | Employee: ${r.employee.name} (${r.employee.employeeId}) | Status: ${r.status} | Type: ${r.leaveType}`);
            });
        } else {
            console.log('No leave requests found in database.');
        }
    } catch (err) {
        console.error('DATABASE ERROR:', err.message);
    } finally {
        await prisma.$disconnect();
    }
}

check();
