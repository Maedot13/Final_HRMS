/**
 * fix-passwords.ts
 * Directly writes known bcrypt hashes for all test accounts.
 * Run: npx ts-node fix-passwords.ts
 */
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();
const SALT_ROUNDS = 10;

const accounts = [
    { employeeId: 'EMP_REGULAR',  password: 'Emp@12345'     },
    { employeeId: 'EMP_HR_TEST',  password: 'Hr@12345'      },
    { employeeId: 'EMP0001',       password: 'HeadHr@12345'  },
    { employeeId: 'EMP_DEPT_HEAD', password: 'Dept@12345'    },
    { employeeId: 'EMP_DEAN_TEST', password: 'Dean@12345'    },
    { employeeId: 'EMP_VP_TEST',   password: 'VP@12345!!'    },
    { employeeId: 'EMP_SABBATICAL', password: 'Sabb@12345'   },
    { employeeId: 'EMP_ADMIN',     password: 'Admin@12345'   },
];

async function main() {
    console.log('🔧 Fixing passwords for all test accounts...\n');

    for (const acct of accounts) {
        const user = await prisma.user.findUnique({ where: { employeeId: acct.employeeId } });
        if (!user) {
            console.log(`  ⚠️  ${acct.employeeId} — not found in DB, skipping`);
            continue;
        }

        const hash = await bcrypt.hash(acct.password, SALT_ROUNDS);

        // Verify round-trip before writing
        const verify = await bcrypt.compare(acct.password, hash);
        if (!verify) {
            console.error(`  ❌ Hash verification failed for ${acct.employeeId}!`);
            continue;
        }

        await prisma.user.update({
            where: { id: user.id },
            data: { passwordHash: hash, mustChangePassword: false, isActive: true },
        });

        // Double-check against DB record
        const updated = await prisma.user.findUnique({ where: { id: user.id } });
        const dbVerify = await bcrypt.compare(acct.password, updated!.passwordHash);

        console.log(`  ${dbVerify ? '✅' : '❌'}  ${acct.employeeId.padEnd(16)} | ${acct.password} | DB verify: ${dbVerify}`);
    }

    console.log('\n✅ Done. Login with the Employee ID and password shown above.\n');
}

main()
    .catch(e => { console.error(e); process.exit(1); })
    .finally(() => prisma.$disconnect());
