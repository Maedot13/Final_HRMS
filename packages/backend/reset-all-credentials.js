/**
 * reset-all-credentials.js
 * Resets ALL test account passwords + creates SUPER_ADMIN.
 * Uses Neon WebSocket transport directly (bypasses the running server).
 * Run: node reset-all-credentials.js
 */
require('dotenv').config();
const { Pool, neonConfig } = require('./node_modules/@neondatabase/serverless');
const ws = require('ws');
const bcrypt = require('bcrypt');

neonConfig.webSocketConstructor = ws;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const ACCOUNTS = [
    { employeeId: 'SUPER-ADMIN-001', email: 'superadmin@hrms.system',  password: 'SuperAdmin@1234', role: 'SUPER_ADMIN', scope: 'UNIVERSITY', create: true },
    { employeeId: 'EMP_SABBATICAL',  password: 'Sabb@12345'   },
    { employeeId: 'EMP_HR_TEST',     password: 'Hr@12345'     },
    { employeeId: 'EMP0001',         password: 'HeadHr@12345' },
    { employeeId: 'EMP_DEPT_HEAD',   password: 'Dept@12345'   },
    { employeeId: 'EMP_REGULAR',     password: 'Emp@12345'    },
    { employeeId: 'EMP_DEAN_TEST',   password: 'Dean@12345'   },
    { employeeId: 'EMP_VP_TEST',     password: 'VP@12345!!'   },
    { employeeId: 'AAU-ADMIN-001',   password: 'Admin@12345'  },
];

async function main() {
    console.log('\n🔧 Resetting all credentials...\n');

    // Verify connection
    await pool.query('SELECT 1');
    console.log('✅ DB connected\n');

    for (const acct of ACCOUNTS) {
        const hash = await bcrypt.hash(acct.password, 10);

        if (acct.create) {
            // Upsert SUPER_ADMIN
            await pool.query(`
                INSERT INTO "User" ("employeeId", email, "passwordHash", role, scope, "isActive", "mustChangePassword", "createdAt", "updatedAt")
                VALUES ($1, $2, $3, $4, $5, true, false, NOW(), NOW())
                ON CONFLICT ("employeeId") DO UPDATE SET
                    "passwordHash" = EXCLUDED."passwordHash",
                    role = $4, scope = $5,
                    "isActive" = true, "mustChangePassword" = false, "updatedAt" = NOW()
            `, [acct.employeeId, acct.email, hash, acct.role, acct.scope]);

            const verify = await pool.query('SELECT "passwordHash" FROM "User" WHERE "employeeId"=$1', [acct.employeeId]);
            const ok = await bcrypt.compare(acct.password, verify.rows[0].passwordHash);
            console.log(`  ${ok ? '✅' : '❌'}  ${acct.employeeId.padEnd(18)} | ${acct.password.padEnd(16)} | ${acct.role} [${acct.scope}]`);
        } else {
            // Update existing
            const res = await pool.query(`
                UPDATE "User" SET "passwordHash"=$1, "mustChangePassword"=false, "isActive"=true, "updatedAt"=NOW()
                WHERE "employeeId"=$2 RETURNING id, "employeeId", role
            `, [hash, acct.employeeId]);

            if (res.rowCount === 0) {
                console.log(`  ⚠️   ${acct.employeeId.padEnd(18)} | not found in DB — skipped`);
            } else {
                const ok = await bcrypt.compare(acct.password, hash);
                console.log(`  ${ok ? '✅' : '❌'}  ${acct.employeeId.padEnd(18)} | ${acct.password.padEnd(16)} | ${res.rows[0].role}`);
            }
        }
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('                    📋  ALL TEST CREDENTIALS');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    const pad = (s, n) => String(s).padEnd(n).slice(0, n);
    console.log(pad('Role/Account', 22) + pad('Employee ID', 20) + 'Password');
    console.log('─'.repeat(65));
    const rows = [
        ['SUPER_ADMIN',        'SUPER-ADMIN-001', 'SuperAdmin@1234'],
        ['DEPARTMENT_HEAD',    'EMP_SABBATICAL',  'Sabb@12345'],
        ['HR Officer',         'EMP_HR_TEST',     'Hr@12345'],
        ['Head HR',            'EMP0001',         'HeadHr@12345'],
        ['Department Head',    'EMP_DEPT_HEAD',   'Dept@12345'],
        ['Employee',           'EMP_REGULAR',     'Emp@12345'],
        ['Dean',               'EMP_DEAN_TEST',   'Dean@12345'],
        ['VP Academic',        'EMP_VP_TEST',     'VP@12345!!'],
        ['Admin',              'AAU-ADMIN-001',   'Admin@12345'],
    ];
    for (const [role, id, pw] of rows) {
        console.log(pad(role, 22) + pad(id, 20) + pw);
    }
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('  Login endpoint: POST http://localhost:3000/api/v1/auth/login');
    console.log('  Body: { "employeeId": "...", "password": "..." }\n');

    await pool.end();
}

main().catch(e => { console.error('❌ Fatal:', e.message); process.exit(1); });
