import { neon } from '@neondatabase/serverless';
import WebSocket from 'ws';

// Configure WebSocket for Node.js environment
if (typeof global.WebSocket === 'undefined') {
  (global as any).WebSocket = WebSocket;
}

async function verifyDatabaseAccess() {
  const connectionString = process.env.DATABASE_URL || 
    "postgresql://neondb_owner:npg_o4yBeulSs9MK@ep-noisy-darkness-aio1cn7i-pooler.c-4.us-east-1.aws.neon.tech/neondb?sslmode=require";
  
  console.log('=== Database Connection Verification ===\n');

  try {
    const sql = neon(connectionString);
    
    // Test 1: Basic connection
    console.log('Test 1: Basic Connection');
    const basicTest = await sql`SELECT current_database(), current_user, version()`;
    console.log(`✓ Database: ${basicTest[0].current_database}`);
    console.log(`✓ User: ${basicTest[0].current_user}`);
    console.log(`✓ PostgreSQL Version: ${basicTest[0].version.split(',')[0]}\n`);
    
    // Test 2: Check tables exist
    console.log('Test 2: Verify Tables');
    const tables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `;
    console.log(`✓ Found ${tables.length} tables:`);
    tables.forEach((t: any) => console.log(`  - ${t.table_name}`));
    console.log();
    
    // Test 3: Count records
    console.log('Test 3: Record Counts');
    const userCount = await sql`SELECT COUNT(*) as count FROM "User"`;
    console.log(`✓ Users: ${userCount[0].count}`);
    
    const campusCount = await sql`SELECT COUNT(*) as count FROM "Campus"`;
    console.log(`✓ Campuses: ${campusCount[0].count}`);
    
    const employeeCount = await sql`SELECT COUNT(*) as count FROM "Employee"`;
    console.log(`✓ Employees: ${employeeCount[0].count}`);
    
    const leaveCount = await sql`SELECT COUNT(*) as count FROM "LeaveRequest"`;
    console.log(`✓ Leave Requests: ${leaveCount[0].count}`);
    console.log();
    
    // Test 4: Sample data
    console.log('Test 4: Sample Data');
    const campuses = await sql`SELECT id, code, name, "isActive" FROM "Campus" LIMIT 5`;
    if (campuses.length > 0) {
      console.log('✓ Campus data:');
      campuses.forEach((c: any) => {
        console.log(`  - ${c.name} (${c.code}) - ${c.isActive ? 'Active' : 'Inactive'}`);
      });
    } else {
      console.log('⚠ No campus data found');
    }
    console.log();
    
    // Test 5: Write test
    console.log('Test 5: Write Permission');
    const testWrite = await sql`
      INSERT INTO "AuditLog" ("action", "entityType", "status", "timestamp")
      VALUES ('USER_LOGIN', 'test', 'SUCCESS', NOW())
      RETURNING id
    `;
    console.log(`✓ Write successful (AuditLog ID: ${testWrite[0].id})`);
    
    // Clean up test record
    await sql`DELETE FROM "AuditLog" WHERE id = ${testWrite[0].id}`;
    console.log('✓ Cleanup successful\n');
    
    console.log('═══════════════════════════════════════════════════');
    console.log('✓✓✓ DATABASE CONNECTION FULLY OPERATIONAL! ✓✓✓');
    console.log('═══════════════════════════════════════════════════');
    console.log('\n📝 Connection Method: Neon Serverless (WebSocket/HTTPS)');
    console.log('   Port 5432 is bypassed using WebSocket protocol');
    console.log('   All database operations are working correctly\n');
    
    return true;
    
  } catch (error: any) {
    console.error('\n✗✗✗ VERIFICATION FAILED ✗✗✗');
    console.error('Error:', error.message);
    if (error.code) console.error('Code:', error.code);
    console.error('\nStack:', error.stack);
    return false;
  }
}

verifyDatabaseAccess()
  .then(success => process.exit(success ? 0 : 1))
  .catch(error => {
    console.error('Unexpected error:', error);
    process.exit(1);
  });
