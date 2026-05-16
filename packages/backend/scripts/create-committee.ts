import { PrismaClient, UserRole, Gender, StaffType, SalaryType, EmploymentStatus, EmploymentType } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
    let user = await prisma.user.findFirst({
        where: { role: UserRole.RECRUITMENT_COMMITTEE },
        include: { employee: true }
    });

    if (user) {
        console.log('Found existing Recruitment Committee user:');
        console.log(`Username (Employee ID): ${user.employeeId}`);
    } else {
        console.log('Creating a new Recruitment Committee user...');
        
        const campus = await prisma.campus.findFirst();
        if (!campus) throw new Error('No campus found. Seed database first.');
        
        let department = await prisma.department.findFirst({ where: { campusId: campus.id } });
        if (!department) {
            department = await prisma.department.create({
                data: { name: 'Recruitment Dept', campusId: campus.id }
            });
        }

        const employeeId = `${campus.employeeIdPrefix}COMMITTEE1`;
        const passwordHash = await bcrypt.hash('Password123!', 10);

        user = await prisma.user.create({
            data: {
                employeeId,
                email: 'committee1@example.com',
                passwordHash,
                role: UserRole.RECRUITMENT_COMMITTEE,
                mustChangePassword: false,
                campusId: campus.id,
                employee: {
                    create: {
                        employeeId,
                        name: 'Recruitment Committee Member',
                        deptLegacy: department.name,
                        position: 'Committee Reviewer',
                        gender: Gender.MALE,
                        staffType: StaffType.REGULAR,
                        hireDate: new Date(),
                        contactInfo: { email: 'committee1@example.com', phone: '0911000000' },
                        grossSalary: 15000,
                        salaryType: SalaryType.MONTHLY,
                        campusId: campus.id,
                        departmentId: department.id,
                        employmentStatus: EmploymentStatus.ACTIVE,
                        employmentType: EmploymentType.PERMANENT
                    }
                }
            },
            include: { employee: true }
        });

        console.log('Created new Recruitment Committee user:');
        console.log(`Username: ${user.employeeId}`);
        console.log('Password: Password123!');
    }
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
