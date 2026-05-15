/**
 * create-super-admin.js
 * Creates or resets the SUPER_ADMIN account with a known password.
 * Uses Neon HTTP transport (HTTPS fetch, no WebSockets/TCP).
 * Run: node create-super-admin.js
 */
require('dotenv').config();
const { neon } = require('./node_modules/@neondatabase/serverless');
const bcrypt = require('bcrypt');

const sql = neon(process.env.DATABASE_URL);

const SUPER_ADMIN = {
    employeeId: 'SUPER-ADMIN-001',
    email: 'superadmin@hrms.system',
    password: 'SuperAdmin@1234',
};

async function main() {
    console.log('\n🔧 Creating / resetting SUPER_ADMIN account...\n');

    // Test connection first
    const test = await sql`SELECT 1 as ok`;
    console.log('✅ DB connected:', test[0]);

    const passwordHash = await bcrypt.hash(SUPER_ADMIN.password, 10);

    // Check if a SUPER_ADMIN already exists
    const existing = await sql`
        SELECT id, "employeeId", role 
        FROM "User" 
        WHERE role = 'SUPER_ADMIN' OR "employeeId" = ${SUPER_ADMIN.employeeId}
        LIMIT 1
    `;

    if (existing.length > 0) {
        const user = existing[0];
        await sql`
            UPDATE "User" 
            SET "passwordHash" = ${passwordHash},
                "mustChangePassword" = false,
                "isActive" = true,
                role = 'SUPER_ADMIN',
                scope = 'UNIVERSITY',
                "updatedAt" = NOW()
            WHERE id = ${user.id}
        `;
        console.log(`✅ Existing user updated → ID: ${user.employeeId}`);
    } else {
        await sql`
            INSERT INTO "User" 
                ("employeeId", email, "passwordHash", role, scope, "isActive", "mustChangePassword", "createdAt", "updatedAt")
            VALUES 
                (${SUPER_ADMIN.employeeId}, ${SUPER_ADMIN.email}, ${passwordHash}, 
                 'SUPER_ADMIN', 'UNIVERSITY', true, false, NOW(), NOW())
        `;
        console.log(`✅ New SUPER_ADMIN created`);
    }

    // Verify round-trip
    const row = await sql`SELECT "passwordHash" FROM "User" WHERE "employeeId" = ${SUPER_ADMIN.employeeId}`;
    const ok = await bcrypt.compare(SUPER_ADMIN.password, row[0].passwordHash);

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('         🔑  SUPER ADMIN CREDENTIALS');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`  Employee ID : ${SUPER_ADMIN.employeeId}`);
    console.log(`  Password    : ${SUPER_ADMIN.password}`);
    console.log(`  Role        : SUPER_ADMIN`);
    console.log(`  Scope       : UNIVERSITY`);
    console.log(`  DB Verified : ${ok ? '✅ PASS' : '❌ FAILED'}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

main().catch(e => { console.error('❌ Error:', e.message); process.exit(1); });
