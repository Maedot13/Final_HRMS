import { prisma } from '../src/lib/prisma';
import { UserRole, LeaveType, LeaveStatus, LeaveStage, StaffType } from '@prisma/client';
import * as bcrypt from 'bcrypt';

async function main() {
    console.log('Seeding Ethiopian Leave Workflow Users...');

    // Hash common password
    const passwordHash = await bcrypt.hash('Password@123', 10);

    // 1. Ensure a campus exists
    let campus = await prisma.campus.findFirst();
    if (!campus) {
        campus = await prisma.campus.create({
            data: {
                code: 'ET_CAMPUS',
                name: 'Addis Ababa Main Campus',
                description: 'Main Campus',
                timezone: 'Africa/Addis_Ababa',
                employeeIdPrefix: 'AAU',
            }
        });
    }

    // 2. Ensure Academic & Non-Academic Departments
    let academicDept = await prisma.department.findFirst({ where: { name: 'Computer Science' } });
    if (!academicDept) {
        academicDept = await prisma.department.create({
            data: { name: 'Computer Science', campusId: campus.id }
        });
    }

    let adminDept = await prisma.department.findFirst({ where: { name: 'Facilities Management' } });
    if (!adminDept) {
        adminDept = await prisma.department.create({
            data: { name: 'Facilities Management', campusId: campus.id }
        });
    }

    // 3. Create Actors

    // Helper to create user + employee
    const createUser = async (
        email: string,
        name: string,
        role: UserRole,
        empIdStr: string,
        position: string,
        staffType: StaffType,
        privileges: any[],
        deptId: number,
        serviceYears: number = 0
    ) => {
        let user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
            user = await prisma.user.create({
                data: {
                    email,
                    passwordHash,
                    role,
                    employeeId: empIdStr,
                    campusId: campus!.id,
                    specialPrivileges: privileges,
                }
            });
            const emp = await prisma.employee.create({
                data: {
                    userId: user.id,
                    employeeId: empIdStr,
                    name,
                    deptLegacy: position.includes('HR') ? 'HR' : 'Administration',
                    position,
                    staffType,
                    hireDate: new Date(new Date().setFullYear(new Date().getFullYear() - serviceYears)),
                    serviceYears,
                    contactInfo: { phone: '+251911000000', address: 'Addis Ababa' },
                    grossSalary: 15000,
                    campusId: campus!.id,
                    departmentId: deptId,
                }
            });

            // Init leave balances
            await prisma.leaveBalance.create({
                data: {
                    employeeId: emp.id,
                    year: new Date().getFullYear(),
                    annualBalance: 30,
                    sickBalance: 180,
                    maternityBalance: 120,
                    paternityBalance: 10,
                    personalBalance: 3,
                    campusId: campus!.id
                }
            });
        }
        return prisma.employee.findUnique({ where: { userId: user.id }, include: { user: true } });
    };

    const hrOfficer = await createUser(
        'abebe.hr@example.com', 'Abebe Kebede', UserRole.HR_OFFICER, 'AAU-HR-001', 'Senior HR Officer', 'REGULAR', [], adminDept.id, 10
    );

    const vp = await createUser(
        'eskinder.vp@example.com', 'Eskinder Tilahun', UserRole.EMPLOYEE, 'AAU-VP-001', 'Academic Vice President', 'ACADEMIC', ['VICE_PRESIDENT'], adminDept.id, 15
    );

    const dean = await createUser(
        'dawit.dean@example.com', 'Dawit Yohannes', UserRole.EMPLOYEE, 'AAU-DN-001', 'College Dean', 'ACADEMIC', ['DEAN'], academicDept.id, 12
    );

    const deptHead = await createUser(
        'tigist.head@example.com', 'Tigist Bekele', UserRole.DEPARTMENT_HEAD, 'AAU-DH-001', 'Department Head', 'ACADEMIC', [], academicDept.id, 8
    );

    // Update Dept Head relation
    await prisma.department.update({
        where: { id: academicDept.id },
        data: { headEmployeeId: deptHead!.id }
    });

    const academicEmp = await createUser(
        'helen.academic@example.com', 'Helen Assefa', UserRole.EMPLOYEE, 'AAU-AC-001', 'Assistant Professor', 'ACADEMIC', [], academicDept.id, 7 // 7 years -> eligible for Sabbatical
    );

    const nonAcademicEmp = await createUser(
        'girma.admin@example.com', 'Girma Tadesse', UserRole.EMPLOYEE, 'AAU-NA-001', 'IT Support', 'REGULAR', [], adminDept.id, 3
    );

    // 4. Create sample leave requests to test tracking

    console.log('Creating sample leave requests...');

    // Sabbatical (Helen)
    await prisma.leaveRequest.create({
        data: {
            employeeId: academicEmp!.id,
            leaveType: LeaveType.SABBATICAL,
            startDate: new Date(Date.now() + 86400000 * 30),
            endDate: new Date(Date.now() + 86400000 * 395),
            days: 365,
            reason: 'Post-doctoral research at AAU',
            status: LeaveStatus.PENDING,
            currentStage: LeaveStage.DEPT_HEAD,
            campusId: campus.id
        }
    });

    // Research (Helen)
    await prisma.leaveRequest.create({
        data: {
            employeeId: academicEmp!.id,
            leaveType: LeaveType.RESEARCH,
            startDate: new Date(Date.now() + 86400000 * 10),
            endDate: new Date(Date.now() + 86400000 * 40),
            days: 30,
            reason: 'Data collection in regional zones',
            status: LeaveStatus.PENDING,
            currentStage: LeaveStage.DEPT_HEAD,
            campusId: campus.id
        }
    });

    // Without Pay (Girma)
    await prisma.leaveRequest.create({
        data: {
            employeeId: nonAcademicEmp!.id,
            leaveType: LeaveType.UNPAID,
            startDate: new Date(Date.now() + 86400000 * 10),
            endDate: new Date(Date.now() + 86400000 * 20),
            days: 10,
            reason: 'Personal family matters requiring unpaid time off',
            status: LeaveStatus.PENDING,
            currentStage: LeaveStage.DEPT_HEAD,
            campusId: campus.id
        }
    });

    // Annual (Girma)
    await prisma.leaveRequest.create({
        data: {
            employeeId: nonAcademicEmp!.id,
            leaveType: LeaveType.ANNUAL,
            startDate: new Date(Date.now() + 86400000 * 5),
            endDate: new Date(Date.now() + 86400000 * 15),
            days: 10,
            reason: 'Annual family vacation',
            status: LeaveStatus.PENDING,
            currentStage: LeaveStage.DEPT_HEAD,
            campusId: campus.id
        }
    });

    // 5. Output Credentials
    console.log('\n======================================================');
    console.log('✅ TEST DATA CREATED SUCCESSFULLY (Ethiopian Context)');
    console.log('======================================================\n');
    console.log('Use password: Password@123  for ALL accounts\n');

    const creds = [
        { Role: 'HR Officer', Name: 'Abebe Kebede', Email: hrOfficer!.user.email },
        { Role: 'Academic Vice President', Name: 'Eskinder Tilahun', Email: vp!.user.email },
        { Role: 'College Dean', Name: 'Dawit Yohannes', Email: dean!.user.email },
        { Role: 'Department Head', Name: 'Tigist Bekele', Email: deptHead!.user.email },
        { Role: 'Academic Employee', Name: 'Helen Assefa', Email: academicEmp!.user.email },
        { Role: 'Non-Academic Employee', Name: 'Girma Tadesse', Email: nonAcademicEmp!.user.email },
    ];

    console.table(creds);

    console.log('\n--- HOW TO TEST MANUALLY ---');
    console.log('1. Log in as Helen Assefa (Academic) or Girma Tadesse (Non-Academic).');
    console.log('   -> Go to "Leave Management" to see "My Requests" and their PENDING status.');
    console.log('2. Log in as Tigist Bekele (Department Head).');
    console.log('   -> Go to "Leave Management" -> "Dept Approvals". Approve the leaves.');
    console.log('3. Log in as Dawit Yohannes (College Dean).');
    console.log('   -> Go to "Leave Management" -> "Pending Approvals". Approve Sabbatical, Research, and Unpaid leaves.');
    console.log('4. Log in as Eskinder Tilahun (Academic VP).');
    console.log('   -> Go to "Leave Management" -> "Pending Approvals". Approve Sabbatical, Research, and Unpaid leaves.');
    console.log('5. Log in as Abebe Kebede (HR Officer).');
    console.log('   -> Go to "Leave Management" -> "Pending Approvals". Give FINAL approval to all leaves.');
    console.log('6. Log in as Helen or Girma again. You will see the requests change to "APPROVED".');
    console.log('======================================================\n');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
