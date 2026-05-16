import { PrismaClient, UserRole, Gender, StaffType, SalaryType, EmploymentStatus, EmploymentType } from '@prisma/client';
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
    console.log('Searching for a Recruitment Committee user...');
    
    let user = await prisma.user.findFirst({
        where: { role: UserRole.RECRUITMENT_COMMITTEE },
        include: { employee: true }
    });

    if (user) {
        console.log('Found existing Recruitment Committee user:');
        console.log(`Employee ID (Username): ${user.employeeId}`);
        console.log('Password: (Password is hashed in DB, if you do not know it, I will reset it to Password123!)');
        
        // Reset password to be safe
        const passwordHash = await bcrypt.hash('Password123!', 10);
        await prisma.user.update({
            where: { id: user.id },
            data: { passwordHash, mustChangePassword: false }
        });
        console.log('Password has been reset to: Password123!');
    } else {
        console.log('No Recruitment Committee user found. Creating one...');
        
        // Find a campus and department
        const campus = await prisma.campus.findFirst();
        if (!campus) throw new Error('No campus found. Run seed script first.');
        
        let department = await prisma.department.findFirst({ where: { campusId: campus.id } });
        if (!department) {
            department = await prisma.department.create({
                data: { name: 'Human Resources', campusId: campus.id }
            });
        }

        const employeeId = `${campus.employeeIdPrefix}99999`;
        const passwordHash = await bcrypt.hash('Password123!', 10);

        user = await prisma.user.create({
            data: {
                employeeId,
                email: 'committee@example.com',
                passwordHash,
                role: UserRole.RECRUITMENT_COMMITTEE,
                mustChangePassword: false,
                campusId: campus.id,
                employee: {
                    create: {
                        employeeId,
                        name: 'Recruitment Committee Member',
                        deptLegacy: department.name,
                        position: 'Committee Member',
                        gender: Gender.MALE,
                        staffType: StaffType.REGULAR,
                        hireDate: new Date(),
                        contactInfo: { email: 'committee@example.com', phone: '0911000000' },
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
        console.log(`Employee ID (Username): ${user.employeeId}`);
        console.log('Password: Password123!');
    }
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
