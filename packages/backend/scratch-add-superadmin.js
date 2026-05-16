const { neon } = require('@neondatabase/serverless');
require('dotenv').config();

const sql = neon(process.env.DATABASE_URL);

async function main() {
    console.log("Adding employee profile for SUPER_ADMIN...");
    
    // Get the SUPER_ADMIN user
    const users = await sql`SELECT id, "employeeId", "campusId" FROM "User" WHERE role = 'SUPER_ADMIN'`;
    if (users.length === 0) {
        console.log("SUPER_ADMIN not found");
        return;
    }
    
    const user = users[0];
    console.log("Found user:", user);
    
    // Check if employee already exists
    const employees = await sql`SELECT id FROM "Employee" WHERE "userId" = ${user.id}`;
    if (employees.length > 0) {
        console.log("Employee profile already exists.");
        await sql`UPDATE "Employee" SET name = 'Yohannes Tadesse' WHERE id = ${employees[0].id}`;
        console.log("Updated name to Yohannes Tadesse.");
        return;
    }
    
    // Get a campus if user.campusId is null
    let campusId = user.campusId;
    if (!campusId) {
        const campuses = await sql`SELECT id FROM "Campus" LIMIT 1`;
        if (campuses.length > 0) {
            campusId = campuses[0].id;
        }
    }
    
    console.log("Creating employee profile with campusId:", campusId);
    
    await sql`
        INSERT INTO "Employee" 
        ("userId", "employeeId", name, department, position, "hireDate", "serviceYears", "grossSalary", "salaryType", "contactInfo", "campusId")
        VALUES 
        (${user.id}, ${user.employeeId}, 'Yohannes Tadesse', 'University Administration', 'Chief Administrator', '2020-01-01', 6, 50000, 'MONTHLY', '{}', ${campusId})
    `;
    
    console.log("✅ Successfully created employee profile for SUPER_ADMIN");
}

main().catch(console.error);
