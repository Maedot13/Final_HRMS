import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();

async function main() {
    try {
        // Step 1: The exact query auth.service.ts runs
        console.log('\n--- Step 1: findUnique with clearanceUnit include ---');
        const user = await prisma.user.findUnique({
            where: { employeeId: 'EMP0001' },
            include: { employee: true, campus: true, clearanceUnit: true }
        });
        console.log('Step 1 OK. User:', user ? user.employeeId : 'null');

        if (!user) {
            console.log('User not found. Cannot proceed.');
            return;
        }

        // Step 2: Password check
        console.log('\n--- Step 2: Password comparison ---');
        const match = await bcrypt.compare('Admin@123', user.passwordHash);
        console.log('Step 2 OK. Password match:', match);

        // Step 3: Token creation - the exact call in token.service.ts
        console.log('\n--- Step 3: RefreshToken.create in DB ---');
        const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'your_development_jwt_refresh_secret_key_here';
        const JWT_SECRET = process.env.JWT_SECRET || 'your_development_jwt_secret_key_here';

        const refreshTokenStr = jwt.sign({ userId: user.id }, JWT_REFRESH_SECRET, { expiresIn: '7d' });
        const decoded: any = jwt.verify(refreshTokenStr, JWT_REFRESH_SECRET);
        const expiresAt = new Date(decoded.exp * 1000);

        const savedToken = await prisma.refreshToken.create({
            data: {
                token: refreshTokenStr,
                userId: user.id,
                expiresAt
            }
        });
        console.log('Step 3 OK. RefreshToken saved with id:', savedToken.id);

        // Step 4: Audit log
        console.log('\n--- Step 4: AuditLog.create ---');
        const { AuditAction } = await import('@prisma/client');
        await prisma.auditLog.create({
            data: {
                userId: user.id,
                action: AuditAction.USER_LOGIN,
                entityType: 'User',
                entityId: user.id,
                ipAddress: '127.0.0.1'
            }
        });
        console.log('Step 4 OK. Audit log created.');

        console.log('\n✅ ALL STEPS PASSED. Login flow should work.');
    } catch (e: any) {
        console.error('\n❌ FAILURE:', e.message);
        if (e.code) console.error('Prisma error code:', e.code);
        if (e.meta) console.error('Prisma meta:', JSON.stringify(e.meta, null, 2));
        console.error('\nFull error stack:', e.stack);
    } finally {
        await prisma.$disconnect();
    }
}

main();
