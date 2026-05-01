/**
 * seed-leave-test.ts
 * ------------------
 * Resets passwords for all test accounts to known values and
 * ensures a Dean and VP user exist for testing Research/Sabbatical flows.
 *
 * Run: npx ts-node src/scripts/seed-leave-test.ts
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

interface UserSeed {
    where: { employeeId?: string; email?: string };
    password: string;
    label: string;
    extra?: Partial<Parameters<typeof prisma.user.update>[0]['data']>;
}

const COST = 12;
const hash = (p: string) => bcrypt.hash(p, COST);

const seeds: UserSeed[] = [
    {
        label: 'HR Officer (campus 1)',
        where: { employeeId: 'EMP_HR_TEST' },
        password: 'Hr@12345',
    },
    {
        label: 'Head HR (campus 1)',
        where: { employeeId: 'EMP0001' },
        password: 'HeadHr@12345',
        extra: { isHeadHR: true },
    },
    {
        label: 'Department Head (campus 1)',
        where: { employeeId: 'EMP_DEPT_HEAD' },
        password: 'Dept@12345',
    },
    {
        label: 'Employee (campus 1)',
        where: { employeeId: 'EMP_REGULAR' },
        password: 'Emp@12345',
    },
    {
        label: 'Clearance Body – Library',
        where: { employeeId: 'LIB-01' },
        password: 'Lib@12345',
    },
    {
        label: 'Clearance Body – Sport',
        where: { employeeId: 'SPO-01' },
        password: 'Spo@12345',
    },
    {
        label: 'Clearance Body – IT',
        where: { employeeId: 'IT-01' },
        password: 'It@12345',
    },
];

async function main() {
    console.log('\n🌱  Seeding test credentials...\n');

    // ── 1. Reset passwords for existing test users ──────────────────────────
    for (const seed of seeds) {
        const user = await prisma.user.findFirst({ where: seed.where as any });
        if (!user) {
            console.warn(`  ⚠️  User not found: ${JSON.stringify(seed.where)} — skipping`);
            continue;
        }

        const passwordHash = await hash(seed.password);
        await prisma.user.update({
            where: { id: user.id },
            data: {
                passwordHash,
                mustChangePassword: false,
                isActive: true,
                ...(seed.extra ?? {}),
            },
        });
        console.log(`  ✅  ${seed.label}  →  ID: ${user.employeeId}  |  Password: ${seed.password}`);
    }

    // ── 2. Ensure a Dean user exists ────────────────────────────────────────
    const deanEmail = 'dean.test@bdu.edu.et';
    let deanUser = await prisma.user.findUnique({ where: { email: deanEmail } });
    if (!deanUser) {
        // Find campus 1
        const campus = await prisma.campus.findFirst({ where: { isActive: true } });
        if (!campus) throw new Error('No active campus found — cannot create Dean user');

        deanUser = await prisma.user.create({
            data: {
                email: deanEmail,
                employeeId: 'EMP_DEAN_TEST',
                passwordHash: await hash('Dean@12345'),
                role: 'HR_OFFICER',           // Base role HR (Dean is a privilege, not a role)
                scope: 'CAMPUS',
                campusId: campus.id,
                specialPrivileges: ['DEAN'],
                mustChangePassword: false,
                isActive: true,
            },
        });
        // Create minimal employee record
        await prisma.employee.create({
            data: {
                userId: deanUser.id,
                campusId: campus.id,
                employeeId: 'EMP_DEAN_TEST',
                name: 'Test Dean',
                deptLegacy: 'Academic Affairs',
                position: 'College Dean',
                hireDate: new Date('2015-01-01'),
                contactInfo: {},
            },
        });
        console.log(`  ✅  Dean (new)  →  ID: EMP_DEAN_TEST  |  Password: Dean@12345`);
    } else {
        const deanPwHash = await hash('Dean@12345');
        await prisma.user.update({
            where: { id: deanUser.id },
            data: { passwordHash: deanPwHash, mustChangePassword: false, specialPrivileges: ['DEAN'] },
        });
        console.log(`  ✅  Dean (existing)  →  ID: ${deanUser.employeeId}  |  Password: Dean@12345`);
    }

    // ── 3. Ensure a VP user exists ──────────────────────────────────────────
    const vpEmail = 'vp.academic.test@bdu.edu.et';
    let vpUser = await prisma.user.findUnique({ where: { email: vpEmail } });
    if (!vpUser) {
        vpUser = await prisma.user.create({
            data: {
                email: vpEmail,
                employeeId: 'EMP_VP_TEST',
                passwordHash: await hash('VP@12345!!'),
                role: 'HR_OFFICER',
                scope: 'UNIVERSITY',
                campusId: null,
                specialPrivileges: ['VICE_PRESIDENT'],
                mustChangePassword: false,
                isActive: true,
            },
        });
        await prisma.employee.create({
            data: {
                userId: vpUser.id,
                campusId: null,
                employeeId: 'EMP_VP_TEST',
                name: 'Test VP Academic',
                deptLegacy: 'University Leadership',
                position: 'Academic Vice President',
                hireDate: new Date('2010-01-01'),
                contactInfo: {},
            },
        });
        console.log(`  ✅  VP Academic (new)  →  ID: EMP_VP_TEST  |  Password: VP@12345!!`);
    } else {
        const vpPwHash = await hash('VP@12345!!');
        await prisma.user.update({
            where: { id: vpUser.id },
            data: { passwordHash: vpPwHash, mustChangePassword: false, specialPrivileges: ['VICE_PRESIDENT'] },
        });
        console.log(`  ✅  VP Academic (existing)  →  ID: ${vpUser.employeeId}  |  Password: VP@12345!!`);
    }

    // ── 4. Print credentials summary ────────────────────────────────────────
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('                    📋  TEST CREDENTIALS SUMMARY');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    const creds = [
        ['HR Officer',          'EMP_HR_TEST',    'Hr@12345',     'Standard leaves stage 2'],
        ['Head HR',             'EMP0001',         'HeadHr@12345', 'Clearance final approve'],
        ['Department Head',     'EMP_DEPT_HEAD',   'Dept@12345',   'Leave stage 1 review'],
        ['Employee',            'EMP_REGULAR',     'Emp@12345',    'Apply for leave'],
        ['Dean',                'EMP_DEAN_TEST',   'Dean@12345',   'Research leave final'],
        ['VP Academic',         'EMP_VP_TEST',     'VP@12345!!',   'Sabbatical leave final'],
        ['Clearance – Library', 'LIB-01',          'Lib@12345',    'Clearance body'],
        ['Clearance – Sport',   'SPO-01',          'Spo@12345',    'Clearance body'],
        ['Clearance – IT',      'IT-01',           'It@12345',     'Clearance body'],
    ];
    const col = (s: string, w: number) => s.padEnd(w).slice(0, w);
    console.log(col('Role', 22) + col('Employee ID', 18) + col('Password', 16) + 'Notes');
    console.log('─'.repeat(80));
    for (const [role, id, pw, note] of creds) {
        console.log(col(role, 22) + col(id, 18) + col(pw, 16) + note);
    }
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('  Login via Employee ID (not email).\n');
}

main()
    .catch((e) => { console.error('Seed error:', e); process.exit(1); })
    .finally(() => prisma.$disconnect());
