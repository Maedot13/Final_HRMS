/**
 * Development & Test Seed Data
 *
 * Creates test users, employees, leave balances, and job postings for manual and integration testing.
 * Prerequisites: Run seed-multi-campus-backfill.ts and seed-clearance-units.ts first.
 *
 * Usage: npx ts-node scripts/seed-dev-data.ts
 *
 * Test Accounts:
 * - EMP_SABBATICAL / password123  → Sabbatical-eligible (10 yrs), Engineering
 * - EMP_DEPT_HEAD / password123   → Department Head, Engineering (for approvals)
 * - EMP_HR_TEST  / password123    → HR Officer
 * - EMP_REGULAR  / password123    → Regular employee (5 yrs, not sabbatical-eligible)
 * - EMP_ADMIN    / password123    → Admin (campus-scoped)
 */

import { UserRole, SalaryType } from '@prisma/client';
import bcrypt from 'bcrypt';
import { prisma } from '../src/lib/prisma';

const TEST_PASSWORD = 'password123';

const TEST_ACCOUNTS = [
  {
    employeeId: 'EMP_SABBATICAL',
    email: 'sabbatical@test.bdu.edu.et',
    name: 'Sabbatical Eligible User',
    department: 'Engineering',
    position: 'Associate Professor',
    role: UserRole.EMPLOYEE,
    serviceYears: 10,
    hireDate: '2014-03-15',
    grossSalary: 25000,
  },
  {
    employeeId: 'EMP_DEPT_HEAD',
    email: 'depthead@test.bdu.edu.et',
    name: 'Department Head Test',
    department: 'Engineering',
    position: 'Professor',
    role: UserRole.DEPARTMENT_HEAD,
    serviceYears: 12,
    hireDate: '2012-01-10',
    grossSalary: 35000,
  },
  {
    employeeId: 'EMP_HR_TEST',
    email: 'hr@test.bdu.edu.et',
    name: 'HR Officer Test',
    department: 'Human Resources',
    position: 'HR Officer',
    role: UserRole.HR_OFFICER,
    serviceYears: 6,
    hireDate: '2018-06-01',
    grossSalary: 18000,
  },
  {
    employeeId: 'EMP_REGULAR',
    email: 'regular@test.bdu.edu.et',
    name: 'Regular Employee',
    department: 'IT',
    position: 'Software Developer',
    role: UserRole.EMPLOYEE,
    serviceYears: 5,
    hireDate: '2019-08-20',
    grossSalary: 15000,
  },
  {
    employeeId: 'EMP_ADMIN',
    email: 'admin@test.bdu.edu.et',
    name: 'Campus Admin Test',
    department: 'Administration',
    position: 'Administrator',
    role: UserRole.ADMIN,
    serviceYears: 8,
    hireDate: '2016-02-01',
    grossSalary: 28000,
  },
];

async function main() {
  console.log('🌱 Seeding development & test data...\n');

  const campus = await prisma.campus.findFirst({
    where: { code: 'MAIN', isActive: true },
  });
  if (!campus) {
    throw new Error('Campus MAIN not found. Run seed-multi-campus-backfill.ts first.');
  }

  const passwordHash = await bcrypt.hash(TEST_PASSWORD, 10);
  const year = new Date().getFullYear();

  for (const acc of TEST_ACCOUNTS) {
    const existingUser = await prisma.user.findUnique({
      where: { email: acc.email },
      include: { employee: true },
    });

    if (existingUser) {
      if (existingUser.employee) {
        await prisma.employee.update({
          where: { id: existingUser.employee.id },
          data: {
            serviceYears: acc.serviceYears,
            hireDate: new Date(acc.hireDate),
            grossSalary: acc.grossSalary,
            campusId: campus.id,
            employeeId: acc.employeeId,
          },
        });
      } else {
        await prisma.employee.create({
          data: {
            userId: existingUser.id,
            employeeId: acc.employeeId,
            name: acc.name,
            deptLegacy: acc.department,
            position: acc.position,
            hireDate: new Date(acc.hireDate),
            serviceYears: acc.serviceYears,
            grossSalary: acc.grossSalary,
            salaryType: SalaryType.MONTHLY,
            contactInfo: {},
            campusId: campus.id,
          },
        });
      }
      await prisma.user.update({
        where: { id: existingUser.id },
        data: {
          passwordHash,
          role: acc.role,
          campusId: campus.id,
          scope: 'CAMPUS',
          employeeId: acc.employeeId,
        },
      });
      console.log(`   Updated: ${acc.employeeId} (${acc.name})`);
    } else {
      const user = await prisma.user.create({
        data: {
          email: acc.email,
          passwordHash,
          role: acc.role,
          scope: 'CAMPUS',
          campusId: campus.id,
          employeeId: acc.employeeId,
        },
      });
      await prisma.employee.create({
        data: {
          userId: user.id,
          employeeId: acc.employeeId,
          name: acc.name,
          deptLegacy: acc.department,
          position: acc.position,
          hireDate: new Date(acc.hireDate),
          serviceYears: acc.serviceYears,
          grossSalary: acc.grossSalary,
          salaryType: SalaryType.MONTHLY,
          contactInfo: {},
          campusId: campus.id,
        },
      });
      console.log(`   Created: ${acc.employeeId} (${acc.name}) - ${acc.serviceYears} yrs service`);
    }
  }

  // Ensure leave balances for sabbatical-eligible and dept head
  const sabbaticalEmp = await prisma.employee.findFirst({
    where: { employeeId: 'EMP_SABBATICAL' },
  });
  const deptHeadEmp = await prisma.employee.findFirst({
    where: { employeeId: 'EMP_DEPT_HEAD' },
  });

  for (const emp of [sabbaticalEmp, deptHeadEmp].filter(Boolean)) {
    if (!emp) continue;
    await prisma.leaveBalance.upsert({
      where: {
        employeeId_year: { employeeId: emp!.id, year },
      },
      update: {},
      create: {
        employeeId: emp!.id,
        year,
        campusId: campus.id,
        annualBalance: 20,
        sickBalance: 15,
        maternityBalance: 90,
        paternityBalance: 5,
      },
    });
  }
  console.log(`   Leave balances upserted for year ${year}`);

  // Create a job posting for recruitment testing (best-effort — skipped if schema mismatch)
  try {
    const hrUser = await prisma.user.findFirst({
      where: { employeeId: 'EMP_HR_TEST' },
    });
    if (hrUser) {
      const existing = await prisma.jobPosting.findFirst({
        where: { campusId: campus.id, title: 'Senior Software Engineer' },
      });
      if (!existing) {
        const deadline = new Date();
        deadline.setMonth(deadline.getMonth() + 2);
        
        const dept = await prisma.department.findFirst({ where: { campusId: campus.id } });
        
        if (dept) {
          await prisma.jobPosting.create({
            data: {
              title: 'Senior Software Engineer',
              description: 'We are looking for an experienced software engineer to join our IT department.',
              requirements: '5+ years experience, BSc in Computer Science or related field',
              departmentId: dept.id,
              position: 'Senior Software Engineer',
              deadline,
              status: 'OPEN',
              createdBy: hrUser.id,
              campusId: campus.id,
            },
          });
          console.log('   Job posting created for recruitment testing');
        } else {
          console.log('   Skipped job posting creation: No department found.');
        }
      } else {
        console.log('   Job posting already exists for recruitment testing');
      }
    }
  } catch (jobErr: any) {
    console.warn(`   ⚠️  Job posting seed skipped (schema mismatch or DB error): ${jobErr.message}`);
  }

  console.log('\n✅ Development seed complete.\n');
  console.log('Test credentials (password: password123):');
  console.log('  EMP_SABBATICAL - Sabbatical-eligible (10 yrs)');
  console.log('  EMP_DEPT_HEAD  - Department Head (for approvals)');
  console.log('  EMP_HR_TEST    - HR Officer');
  console.log('  EMP_REGULAR    - Regular employee (5 yrs)');
  console.log('  EMP_ADMIN      - Campus Admin\n');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
