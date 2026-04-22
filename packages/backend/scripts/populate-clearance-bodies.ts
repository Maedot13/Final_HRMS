import { PrismaClient, UserRole } from '@prisma/client';
import bcrypt from 'bcrypt';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

async function main() {
    console.log('Starting clearance bodies seed...');

    const campus = await prisma.campus.findFirst({
        where: { code: 'MAIN_CAMPUS' } // Or just grab the first one
    });

    const targetCampusId = campus?.id || 1; // Fallback to 1

    // Enable sequential clearance for this campus
    await prisma.campus.update({
        where: { id: targetCampusId },
        data: { isClearanceSequential: true }
    });
    console.log(`Updated Campus ${targetCampusId} to sequential clearance mode.`);

    const unitsToCreate = [
        { name: 'LIBRARY', desc: 'Main Campus Library', order: 1, loginId: 'LIB-01', pass: 'LibraryPass123!' },
        { name: 'SPORT', desc: 'Sports and Recreation', order: 2, loginId: 'SPO-01', pass: 'SportPass123!' },
        { name: 'IT', desc: 'Information Technology Services', order: 3, loginId: 'IT-01', pass: 'ITPass123!' },
    ];

    const credentialsLog: string[] = [];
    credentialsLog.push('=== CLEARANCE BODY TEST CREDENTIALS ===\n');

    for (const u of unitsToCreate) {
        // Upsert Unit
        const unit = await prisma.clearanceUnit.upsert({
            where: { campusId_name: { campusId: targetCampusId, name: u.name } },
            update: { priorityOrder: u.order },
            create: {
                name: u.name,
                description: u.desc,
                campusId: targetCampusId,
                priorityOrder: u.order,
                isActive: true,
                isSystemGenerated: false
            }
        });

        // Upsert User
        const passwordHash = await bcrypt.hash(u.pass, 10);
        let user = await prisma.user.findUnique({ where: { employeeId: u.loginId } });
        
        if (!user) {
            user = await prisma.user.create({
                data: {
                    email: `${u.loginId}@body.local`,
                    passwordHash,
                    role: 'CLEARANCE_BODY',
                    employeeId: u.loginId,
                    isActive: true,
                    campusId: targetCampusId,
                    clearanceUnitId: unit.id
                }
            });
        } else {
             await prisma.user.update({
                  where: { id: user.id },
                  data: { clearanceUnitId: unit.id, passwordHash }
             });
        }

        credentialsLog.push(`Unit: ${u.name}`);
        credentialsLog.push(`Login ID (Username): ${u.loginId}`);
        credentialsLog.push(`Password: ${u.pass}`);
        credentialsLog.push(`Order (Priority): ${u.order}`);
        credentialsLog.push('----------------------------------------\n');
    }

    const outputPath = '/home/x/.gemini/antigravity/brain/ae8d40b1-23c4-4b67-aafe-5451503c4349/scratch/test_credentials.txt';
    // Make sure scratch dir exists
    const scratchDir = path.dirname(outputPath);
    if (!fs.existsSync(scratchDir)) {
         fs.mkdirSync(scratchDir, { recursive: true });
    }
    fs.writeFileSync(outputPath, credentialsLog.join('\n'));
    console.log(`Finished seeding! View credentials at ${outputPath}`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
