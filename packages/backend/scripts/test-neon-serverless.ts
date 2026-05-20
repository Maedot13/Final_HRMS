import { neon } from '@neondatabase/serverless';
import WebSocket from 'ws';

// Configure WebSocket for Node.js environment
if (typeof global.WebSocket === 'undefined') {
  (global as any).WebSocket = WebSocket;
}

async function testServerlessConnection() {
  // Neon serverless driver uses HTTP/WebSocket, bypassing port 5432
  const connectionString = process.env.DATABASE_URL || 
    "postgresql://neondb_owner:npg_o4yBeulSs9MK@ep-noisy-darkness-aio1cn7i-pooler.c-4.us-east-1.aws.neon.tech/neondb?sslmode=require";
  
  console.log('=== Testing Neon Serverless Connection (HTTP/WebSocket) ===\n');
  console.log('This method bypasses port 5432 and uses HTTPS instead.');
  console.log('Connection string:', connectionString.replace(/:[^:@]+@/, ':****@'));
  console.log();

  try {
    const sql = neon(connectionString);
    
    console.log('Attempting to connect via serverless driver...');
    
    // Test query
    const result = await sql`SELECT current_database(), current_user, version()`;
    
    console.log('✓✓✓ CONNECTION SUCCESSFUL! ✓✓✓\n');
    console.log('Database:', result[0].current_database);
    console.log('User:', result[0].current_user);
    console.log('Version:', result[0].version);
    console.log();
    
    // Test actual data
    console.log('Testing data access...');
    const users = await sql`SELECT COUNT(*) as count FROM "User"`;
    console.log(`✓ User table accessible. Count: ${users[0].count}`);
    
    const campuses = await sql`SELECT COUNT(*) as count FROM "Campus"`;
    console.log(`✓ Campus table accessible. Count: ${campuses[0].count}`);
    
    const employees = await sql`SELECT COUNT(*) as count FROM "Employee"`;
    console.log(`✓ Employee table accessible. Count: ${employees[0].count}`);
    
    console.log('\n✓✓✓ Database is fully operational! ✓✓✓');
    return true;
    
  } catch (error: any) {
    console.error('✗✗✗ Connection failed ✗✗✗');
    console.error('Error:', error.message);
    console.error('Code:', error.code);
    
    if (error.message.includes('does not exist')) {
      console.log('\n⚠ Database or tables do not exist. You may need to run migrations.');
    } else if (error.message.includes('authentication')) {
      console.log('\n⚠ Authentication failed. Check your credentials.');
    } else {
      console.log('\n⚠ Unknown error. The database might be deleted or suspended.');
    }
    
    return false;
  }
}

testServerlessConnection()
  .then(success => process.exit(success ? 0 : 1))
  .catch(error => {
    console.error('Unexpected error:', error);
    process.exit(1);
  });
