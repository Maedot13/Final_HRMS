import { PrismaClient } from '@prisma/client'; 
const prisma = new PrismaClient(); 
async function check() { 
    const users = await prisma.user.findMany({ 
        select: { employeeId: true, role: true, email: true, isActive: true }
    }); 
    console.log(JSON.stringify(users, null, 2)); 
} 
check().finally(() => prisma.$disconnect());
