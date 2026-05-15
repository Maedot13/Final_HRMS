import { PrismaClient } from '@prisma/client';
import { PrismaNeon } from '@prisma/adapter-neon';
import { Pool, neonConfig } from '@neondatabase/serverless';
import WebSocket from 'ws';

// Configure WebSocket for Node.js environment
neonConfig.webSocketConstructor = WebSocket;

async function testPrismaWithServerless() {
  const connectionString = process.env.DATABASE_URL || 
    "postgresql://neondb_owner:npg_o4yBeulSs9MK@ep-noisy-darkness-aio1cn7i-pooler.c-4.us-east-1.aws.neon.tech/neondb?sslmode=require";
  
  console.log('=== Testing Prisma with Neon Serverless Adapter ===\n');
  console.log('This uses WebSocket/HTTPS instead of port 5432\n');

  try {
    // Create Neon serverless pool
    const pool = new Pool({ connectionString });
    const adapter = new PrismaNeon(pool);
    
    // Create Prisma client with adapter
    const prisma = new PrismaClient({ adapter });
    
    console.log('Connecting to database...');
    await prisma.$connect();
    console.log('✓ Connected!\n');
    
    // Test queries
    console.log('Testing database access...');
    
    const userCount = await prisma.user.count();
    console.log(`✓ Users: ${userCount}`);
    
    const campusCount = await prisma.campus.count();
    console.log(`✓ Campuses: ${campusCount}`);
    
    const employeeCount = await prisma.employee.count();
    console.log(`✓ Employees: ${employeeCount}`);
    
    const leaveCount = await prisma.leaveRequest.count();
    console.log(`✓ Leave Requests: ${leaveCount}`);
    
    // Test a more complex query
    const activeCampuses = await prisma.campus.findMany({
      where: { isActive: true },
      select: { name: true, code: true }
    });
    console.log(`✓ Active Campuses: ${activeCampuses.length}`);
    if (activeCampuses.length > 0) {
      activeCampuses.forEach(c => console.log(`  - ${c.name} (${c.code})`));
    }
    
    await prisma.$disconnect();
    
    console.log('\n✓✓✓ DATABASE CONNECTION FULLY OPERATIONAL! ✓✓✓');
    console.log('\n📝 Solution: Use Neon serverless adapter with Prisma');
    console.log('   This bypasses the blocked port 5432 issue.');
    
    return true;
    
  } catch (error: any) {
    console.error('✗✗✗ Connection failed ✗✗✗');
    console.error('Error:', error.message);
    if (error.code) console.error('Code:', error.code);
    return false;
  }
}

testPrismaWithServerless()
  .then(success => process.exit(success ? 0 : 1))
  .catch(error => {
    console.error('Unexpected error:', error);
    process.exit(1);
  });
