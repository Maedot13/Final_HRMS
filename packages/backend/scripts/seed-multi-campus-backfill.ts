/**
 * Multi-Campus Phase 1: Create default campus and backfill all existing rows.
 * Run once after applying the add_multi_campus_phase1 migration.
 *
 * Usage: npx ts-node scripts/seed-multi-campus-backfill.ts
 * Or: npm run seed (if configured to run this)
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const DEFAULT_CAMPUS = {
  code: 'MAIN',
  name: 'Main Campus',
  description: 'Default campus (single-campus migration)',
};

async function main() {
  console.log('🌱 Multi-Campus Phase 1: Creating default campus and backfilling...');

  // 1. Create default campus if not exists
  let campus = await prisma.campus.findUnique({
    where: { code: DEFAULT_CAMPUS.code },
  });
  if (!campus) {
    campus = await prisma.campus.create({
      data: DEFAULT_CAMPUS,
    });
    console.log(`   Created campus: ${campus.name} (id=${campus.id})`);
  } else {
    console.log(`   Using existing campus: ${campus.name} (id=${campus.id})`);
  }

  const campusId = campus.id;

  // 2. Backfill User
  const usersUpdated = await prisma.user.updateMany({
    where: { campusId: null },
    data: { campusId },
  });
  console.log(`   Users: ${usersUpdated.count} set to campusId=${campusId}`);

  // 3. Backfill Employee
  const employeesUpdated = await prisma.employee.updateMany({
    where: { campusId: null },
    data: { campusId },
  });
  console.log(`   Employees: ${employeesUpdated.count} set to campusId=${campusId}`);

  // 4. Backfill LeaveRequest from Employee.campusId
  const employees = await prisma.employee.findMany({
    where: { campusId: { not: null } },
    select: { id: true, campusId: true },
  });
  const empMap = new Map(employees.map((e) => [e.id, e.campusId]));
  let lrCount = 0;
  const leaveRequests = await prisma.leaveRequest.findMany({
    where: { campusId: null },
    select: { id: true, employeeId: true },
  });
  for (const lr of leaveRequests) {
    const cid = empMap.get(lr.employeeId) ?? campusId;
    await prisma.leaveRequest.update({
      where: { id: lr.id },
      data: { campusId: cid },
    });
    lrCount++;
  }
  console.log(`   LeaveRequests: ${lrCount} backfilled`);

  // 5. Backfill LeaveBalance from Employee
  let lbCount = 0;
  const leaveBalances = await prisma.leaveBalance.findMany({
    where: { campusId: null },
    select: { id: true, employeeId: true },
  });
  for (const lb of leaveBalances) {
    const cid = empMap.get(lb.employeeId) ?? campusId;
    await prisma.leaveBalance.update({
      where: { id: lb.id },
      data: { campusId: cid },
    });
    lbCount++;
  }
  console.log(`   LeaveBalances: ${lbCount} backfilled`);

  // 6. Backfill SabbaticalRequest from Employee
  let srCount = 0;
  const sabbaticalRequests = await prisma.sabbaticalRequest.findMany({
    where: { campusId: null },
    select: { id: true, employeeId: true },
  });
  for (const sr of sabbaticalRequests) {
    const cid = empMap.get(sr.employeeId) ?? campusId;
    await prisma.sabbaticalRequest.update({
      where: { id: sr.id },
      data: { campusId: cid },
    });
    srCount++;
  }
  console.log(`   SabbaticalRequests: ${srCount} backfilled`);

  // 7. Backfill ClearanceRequest from Employee
  let crCount = 0;
  const clearanceRequests = await prisma.clearanceRequest.findMany({
    where: { campusId: null },
    select: { id: true, employeeId: true },
  });
  for (const cr of clearanceRequests) {
    const cid = empMap.get(cr.employeeId) ?? campusId;
    await prisma.clearanceRequest.update({
      where: { id: cr.id },
      data: { campusId: cid },
    });
    crCount++;
  }
  console.log(`   ClearanceRequests: ${crCount} backfilled`);

  // 8. Backfill ClearanceUnit (all to default campus)
  const unitsUpdated = await prisma.clearanceUnit.updateMany({
    where: { campusId: null },
    data: { campusId },
  });
  console.log(`   ClearanceUnits: ${unitsUpdated.count} set to campusId=${campusId}`);

  // 9. Backfill JobPosting from creator's campus
  const userCampus = await prisma.user.findMany({
    where: { campusId: { not: null } },
    select: { id: true, campusId: true },
  });
  const userCampusMap = new Map(userCampus.map((u) => [u.id, u.campusId]));
  let jpCount = 0;
  const jobPostings = await prisma.jobPosting.findMany({
    where: { campusId: null },
    select: { id: true, createdBy: true },
  });
  for (const jp of jobPostings) {
    const cid = userCampusMap.get(jp.createdBy) ?? campusId;
    await prisma.jobPosting.update({
      where: { id: jp.id },
      data: { campusId: cid },
    });
    jpCount++;
  }
  console.log(`   JobPostings: ${jpCount} backfilled`);

  // 10. Backfill Notification from User
  let notifCount = 0;
  const notifications = await prisma.notification.findMany({
    where: { campusId: null },
    select: { id: true, userId: true },
  });
  for (const n of notifications) {
    const cid = userCampusMap.get(n.userId) ?? campusId;
    await prisma.notification.update({
      where: { id: n.id },
      data: { campusId: cid },
    });
    notifCount++;
  }
  console.log(`   Notifications: ${notifCount} backfilled`);

  // 11. AuditLog: optional backfill by userId -> User.campusId (leave null for legacy is also fine)
  const auditLogs = await prisma.auditLog.findMany({
    where: { campusId: null },
    select: { id: true, userId: true },
  });
  let auditCount = 0;
  for (const a of auditLogs) {
    if (a.userId != null) {
      const cid = userCampusMap.get(a.userId) ?? campusId;
      await prisma.auditLog.update({
        where: { id: a.id },
        data: { campusId: cid },
      });
      auditCount++;
    }
  }
  console.log(`   AuditLogs: ${auditCount} backfilled (others left null)`);

  // 12. Phase 3: Promote first ADMIN to university scope (SUPER_ADMIN semantics)
  const firstAdmin = await prisma.user.findFirst({
    where: { role: 'ADMIN' },
    orderBy: { id: 'asc' }
  });
  if (firstAdmin) {
    await prisma.user.update({
      where: { id: firstAdmin.id },
      data: { scope: 'UNIVERSITY' }
    });
    console.log(`   University admin: User id=${firstAdmin.id} set to scope=UNIVERSITY`);
  } else {
    console.log('   University admin: No ADMIN user found, skip (create one manually and set scope: UNIVERSITY)');
  }

  console.log('✅ Multi-campus Phase 1 backfill complete.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

