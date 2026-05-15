import { PrismaClient, UserRole, Gender, StaffType, EmploymentStatus, EmploymentType, SalaryType, SpecialPrivilege, UserScope } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    console.log('Seeding data for Leave Workflow Test...');

    const passwordHash = await bcrypt.hash('password123', 10);

    // 1. Create Campus
    const campus = await prisma.campus.upsert({
        where: { code: 'MAIN_CAMPUS' },
        update: {},
        create: {
            code: 'MAIN_CAMPUS',
            name: 'Main Campus',
            timezone: 'Africa/Addis_Ababa',
            employeeIdPrefix: 'BDU',
            employeeNumericLength: 5,
        }
    });

    // 2. Create Department
    const department = await prisma.department.upsert({
        where: { campusId_name: { campusId: campus.id, name: 'Computer Science' } },
        update: {},
        create: {
            campusId: campus.id,
            name: 'Computer Science',
        }
    });

    // Helper to create users with employees
    async function createUserAndEmployee(data: any) {
        let user = await prisma.user.findUnique({ where: { email: data.email } });
        if (!user) {
            user = await prisma.user.create({
                data: {
                    email: data.email,
                    passwordHash,
                    role: data.role,
                    employeeId: data.employeeId,
                    campusId: campus.id,
                    scope: data.scope || UserScope.CAMPUS,
                    specialPrivileges: data.privileges || [],
                    employee: {
                        create: {
                            employeeId: data.employeeId,
                            name: data.name,
                            deptLegacy: 'Computer Science',
                            position: data.position,
                            gender: Gender.MALE,
                            staffType: StaffType.ACADEMIC,
                            hireDate: data.hireDate || new Date('2018-01-01'),
                            serviceYears: data.serviceYears || 8,
                            contactInfo: { email: data.email, phone: '+251911000000' },
                            grossSalary: data.salary || 15000,
                            salaryType: SalaryType.MONTHLY,
                            campusId: campus.id,
                            departmentId: department.id,
                            employmentStatus: EmploymentStatus.ACTIVE,
                            employmentType: EmploymentType.PERMANENT,
                        }
                    }
                }
            });
            console.log(`Created ${data.name} (${data.role}) - ID: ${data.employeeId} / pass: password123`);
        } else {
            console.log(`User ${data.name} already exists.`);
        }
        return user;
    }

    // 3. Create Actors
    // Eligible Employee
    const empAbebe = await createUserAndEmployee({
        email: 'abebe@bdu.edu.et',
        employeeId: 'BDU00001',
        name: 'Abebe Kebede',
        role: UserRole.EMPLOYEE,
        position: 'Assistant Professor',
        hireDate: new Date('2018-01-01'), // > 6 years for Sabbatical
        serviceYears: 8,
    });

    // Department Head
    const deptHeadChala = await createUserAndEmployee({
        email: 'chala@bdu.edu.et',
        employeeId: 'BDU00002',
        name: 'Chala Tadesse',
        role: UserRole.DEPARTMENT_HEAD,
        position: 'Department Head',
    });

    // Update department head
    await prisma.department.update({
        where: { id: department.id },
        data: { headEmployeeId: (await prisma.employee.findUnique({where: {userId: deptHeadChala.id}}))!.id }
    });

    // Dean
    const deanDawit = await createUserAndEmployee({
        email: 'dawit@bdu.edu.et',
        employeeId: 'BDU00003',
        name: 'Dawit Bekele',
        role: UserRole.ADMIN,
        position: 'College Dean',
        privileges: [SpecialPrivilege.DEAN]
    });

    // Academic Vice President
    const vpErmias = await createUserAndEmployee({
        email: 'ermias@bdu.edu.et',
        employeeId: 'BDU00004',
        name: 'Ermias Tilahun',
        role: UserRole.ADMIN,
        scope: UserScope.UNIVERSITY, // system-wide
        position: 'Academic Vice President',
        privileges: [SpecialPrivilege.VICE_PRESIDENT]
    });

    // HR Officer
    const hrFasil = await createUserAndEmployee({
        email: 'fasil@bdu.edu.et',
        employeeId: 'BDU00005',
        name: 'Fasil Getachew',
        role: UserRole.HR_OFFICER,
        position: 'HR Officer',
    });

    console.log('Seeding complete! You can test the workflow with the generated credentials.');
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
