import { neon, neonConfig } from '@neondatabase/serverless';

// Disable WebSocket, force HTTP fetch only
neonConfig.fetchConnectionCache = true;
neonConfig.useSecureWebSocket = true;
neonConfig.pipelineConnect = false;

async function testHttpConnection() {
  const connectionString = process.env.DATABASE_URL || 
    "postgresql://neondb_owner:npg_o4yBeulSs9MK@ep-noisy-darkness-aio1cn7i-pooler.c-4.us-east-1.aws.neon.tech/neondb?sslmode=require";
  
  console.log('=== Testing Neon HTTP-Only Connection ===\n');
  console.log('Forcing HTTP fetch (no WebSocket)\n');

  try {
    const sql = neon(connectionString, {
      fetchOptions: {
        cache: 'no-store',
      },
      fullResults: false,
    });
    
    console.log('Test 1: Basic Query');
    const result = await sql`SELECT current_database(), current_user, version()`;
    console.log(`✓ Database: ${result[0].current_database}`);
    console.log(`✓ User: ${result[0].current_user}`);
    console.log(`✓ Version: ${result[0].version.split(',')[0]}`);
    console.log();
    
    console.log('Test 2: Table Count');
    const tableCount = await sql`
      SELECT COUNT(*) as count 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `;
    console.log(`✓ Tables: ${tableCount[0].count}`);
    console.log();
    
    console.log('Test 3: Record Counts');
    const users = await sql`SELECT COUNT(*) as count FROM "User"`;
    console.log(`✓ Users: ${users[0].count}`);
    
    const campuses = await sql`SELECT COUNT(*) as count FROM "Campus"`;
    console.log(`✓ Campuses: ${campuses[0].count}`);
    
    const employees = await sql`SELECT COUNT(*) as count FROM "Employee"`;
    console.log(`✓ Employees: ${employees[0].count}`);
    console.log();
    
    console.log('Test 4: Sample Data');
    const campusData = await sql`SELECT id, code, name, "isActive" FROM "Campus" LIMIT 3`;
    if (campusData.length > 0) {
      campusData.forEach((c: any) => {
        console.log(`  - ${c.name} (${c.code})`);
      });
    }
    console.log();
    
    console.log('═══════════════════════════════════════════════════');
    console.log('✓✓✓ DATABASE CONNECTION WORKING! ✓✓✓');
    console.log('═══════════════════════════════════════════════════');
    console.log('\n📝 Connection Method: Neon HTTP API');
    console.log('   Using HTTPS fetch instead of PostgreSQL protocol\n');
    
    return true;
    
  } catch (error: any) {
    console.error('\n✗✗✗ CONNECTION FAILED ✗✗✗');
    console.error('Error:', error.message);
    console.error('Name:', error.name);
    if (error.cause) {
      console.error('Cause:', error.cause);
    }
    return false;
  }
}

testHttpConnection()
  .then(success => process.exit(success ? 0 : 1))
  .catch(error => {
    console.error('Unexpected error:', error);
    process.exit(1);
  });
