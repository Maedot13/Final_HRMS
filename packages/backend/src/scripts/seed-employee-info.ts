import { PrismaClient, Gender, StaffType } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Starting employee info seed...');

    const employees = await prisma.employee.findMany();
    const currentYear = new Date().getFullYear();

    for (let i = 0; i < employees.length; i++) {
        const emp = employees[i];
        
        // Assign Gender alternating
        const gender = i % 2 === 0 ? Gender.MALE : Gender.FEMALE;
        
        // Assign Staff Type alternating, but respect existing academic-sounding positions if any
        let staffType = i % 2 === 0 ? StaffType.ACADEMIC : StaffType.REGULAR;
        const pos = emp.position.toLowerCase();
        if (pos.includes('professor') || pos.includes('lecturer') || pos.includes('dean') || pos.includes('academic') || pos.includes('research')) {
            staffType = StaffType.ACADEMIC;
        }

        // Basic Info
        const contactInfo = {
            phone: `+251911${Math.floor(100000 + Math.random() * 900000)}`,
            address: `Block ${Math.floor(1 + Math.random() * 10)}, House ${Math.floor(100 + Math.random() * 900)}`,
            emergencyContact: {
                name: 'Emergency Contact',
                relationship: 'Family',
                phone: `+251922${Math.floor(100000 + Math.random() * 900000)}`
            }
        };

        const officeLocation = `Campus Building ${Math.floor(1 + Math.random() * 5)}, Room ${Math.floor(101 + Math.random() * 400)}`;

        await prisma.employee.update({
            where: { id: emp.id },
            data: {
                gender,
                staffType,
                contactInfo,
                officeLocation,
            }
        });

        // Ensure Leave Balance exists for current year
        const existingBalance = await prisma.leaveBalance.findUnique({
            where: {
                employeeId_year: {
                    employeeId: emp.id,
                    year: currentYear
                }
            }
        });

        if (!existingBalance) {
            await prisma.leaveBalance.create({
                data: {
                    employeeId: emp.id,
                    year: currentYear,
                    annualBalance: 30,
                    sickBalance: 240,
                    maternityBalance: gender === Gender.FEMALE ? 120 : 0,
                    paternityBalance: gender === Gender.MALE ? 10 : 0,
                    personalBalance: 3,
                    campusId: emp.campusId,
                }
            });
        } else {
             await prisma.leaveBalance.update({
                where: { id: existingBalance.id },
                data: {
                    annualBalance: existingBalance.annualBalance === 0 ? 30 : existingBalance.annualBalance,
                    sickBalance: existingBalance.sickBalance === 0 ? 240 : existingBalance.sickBalance,
                    maternityBalance: gender === Gender.FEMALE ? 120 : 0,
                    paternityBalance: gender === Gender.MALE ? 10 : 0,
                    personalBalance: existingBalance.personalBalance === 0 ? 3 : existingBalance.personalBalance,
                }
            });
        }

        console.log(`Updated employee ${emp.employeeId} - ${gender}, ${staffType}, Office: ${officeLocation}`);
    }

    console.log('Employee info seed completed successfully.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
