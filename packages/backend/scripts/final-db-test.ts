import { Pool, neonConfig } from '@neondatabase/serverless';
import WebSocket from 'ws';

// Configure WebSocket for Node.js environment
neonConfig.webSocketConstructor = WebSocket;

async function testDatabaseConnection() {
  const connectionString = process.env.DATABASE_URL || 
    "postgresql://neondb_owner:npg_o4yBeulSs9MK@ep-noisy-darkness-aio1cn7i-pooler.c-4.us-east-1.aws.neon.tech/neondb?sslmode=require";
  
  console.log('=== Final Database Connection Test ===\n');
  console.log('Using: Neon Serverless Pool (WebSocket)\n');

  const pool = new Pool({ connectionString });

  try {
    // Test 1: Basic query
    console.log('Test 1: Basic Connection');
    const client = await pool.connect();
    const result = await client.query('SELECT current_database(), current_user, version()');
    console.log(`✓ Database: ${result.rows[0].current_database}`);
    console.log(`✓ User: ${result.rows[0].current_user}`);
    console.log(`✓ Version: ${result.rows[0].version.split(',')[0]}`);
    client.release();
    console.log();
    
    // Test 2: List tables
    console.log('Test 2: Database Schema');
    const client2 = await pool.connect();
    const tables = await client2.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    console.log(`✓ Found ${tables.rows.length} tables`);
    client2.release();
    console.log();
    
    // Test 3: Count records
    console.log('Test 3: Data Verification');
    const client3 = await pool.connect();
    
    const users = await client3.query('SELECT COUNT(*) as count FROM "User"');
    console.log(`✓ Users: ${users.rows[0].count}`);
    
    const campuses = await client3.query('SELECT COUNT(*) as count FROM "Campus"');
    console.log(`✓ Campuses: ${campuses.rows[0].count}`);
    
    const employees = await client3.query('SELECT COUNT(*) as count FROM "Employee"');
    console.log(`✓ Employees: ${employees.rows[0].count}`);
    
    const leaves = await client3.query('SELECT COUNT(*) as count FROM "LeaveRequest"');
    console.log(`✓ Leave Requests: ${leaves.rows[0].count}`);
    
    client3.release();
    console.log();
    
    // Test 4: Sample data
    console.log('Test 4: Sample Campus Data');
    const client4 = await pool.connect();
    const campusData = await client4.query('SELECT id, code, name, "isActive" FROM "Campus" LIMIT 5');
    if (campusData.rows.length > 0) {
      campusData.rows.forEach((c: any) => {
        console.log(`  - ${c.name} (${c.code}) - ${c.isActive ? 'Active' : 'Inactive'}`);
      });
    } else {
      console.log('  No campus data found');
    }
    client4.release();
    console.log();
    
    // Test 5: Write test
    console.log('Test 5: Write Permission Test');
    const client5 = await pool.connect();
    const writeTest = await client5.query(`
      INSERT INTO "AuditLog" ("action", "entityType", "status", "timestamp")
      VALUES ('USER_LOGIN', 'connection_test', 'SUCCESS', NOW())
      RETURNING id
    `);
    console.log(`✓ Write successful (ID: ${writeTest.rows[0].id})`);
    
    await client5.query('DELETE FROM "AuditLog" WHERE id = $1', [writeTest.rows[0].id]);
    console.log('✓ Cleanup successful');
    client5.release();
    console.log();
    
    await pool.end();
    
    console.log('═══════════════════════════════════════════════════');
    console.log('✓✓✓ ALL TESTS PASSED - DATABASE OPERATIONAL! ✓✓✓');
    console.log('═══════════════════════════════════════════════════');
    console.log('\n📊 Summary:');
    console.log('  • Connection: ✓ Working');
    console.log('  • Schema: ✓ Valid');
    console.log('  • Read Access: ✓ Working');
    console.log('  • Write Access: ✓ Working');
    console.log('\n💡 Solution Applied:');
    console.log('  Using Neon Serverless Pool with WebSocket');
    console.log('  This bypasses the blocked port 5432\n');
    
    return true;
    
  } catch (error: any) {
    console.error('\n✗✗✗ TEST FAILED ✗✗✗');
    console.error('Error:', error.message);
    if (error.code) console.error('Code:', error.code);
    console.error('\nDetails:', error);
    
    await pool.end();
    return false;
  }
}

testDatabaseConnection()
  .then(success => process.exit(success ? 0 : 1))
  .catch(error => {
    console.error('Unexpected error:', error);
    process.exit(1);
  });
