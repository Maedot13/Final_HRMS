import { login } from './src/services/auth.service';
import { prisma } from './src/lib/prisma';

async function main() {
    try {
        console.log("Attempting login...");
        const result = await login({ employeeId: 'AAU-AC-001', password: 'Password@123' });
        console.log("Login successful! User ID:", result.user.id);
    } catch (error) {
        console.error("Login failed:", error);
    } finally {
        await prisma.$disconnect();
    }
}
main();
