import { PrismaClient } from '@prisma/client';

async function testDirectConnection() {
  // Try direct connection (non-pooler)
  const directUrl = "postgresql://neondb_owner:npg_o4yBeulSs9MK@ep-noisy-darkness-aio1cn7i.c-4.us-east-1.aws.neon.tech/neondb?sslmode=require&connect_timeout=30";
  
  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: directUrl
      }
    },
    log: ['query', 'info', 'warn', 'error'],
  });

  try {
    console.log('Testing DIRECT connection (non-pooler)...');
    console.log('URL:', directUrl.replace(/:[^:@]+@/, ':****@'));
    
    await prisma.$connect();
    console.log('✓ Connection established!');
    
    const result = await prisma.user.findFirst();
    console.log('✓ Query successful!');
    console.log('Result:', result ? 'Found user' : 'No user found');
    
    return true;
  } catch (error: any) {
    console.error('✗ Connection failed:');
    console.error('Error code:', error.code);
    console.error('Message:', error.message);
    return false;
  } finally {
    await prisma.$disconnect();
  }
}

async function testPoolerConnection() {
  // Try pooler connection
  const poolerUrl = "postgresql://neondb_owner:npg_o4yBeulSs9MK@ep-noisy-darkness-aio1cn7i-pooler.c-4.us-east-1.aws.neon.tech/neondb?sslmode=require&connect_timeout=30";
  
  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: poolerUrl
      }
    },
    log: ['query', 'info', 'warn', 'error'],
  });

  try {
    console.log('\nTesting POOLER connection...');
    console.log('URL:', poolerUrl.replace(/:[^:@]+@/, ':****@'));
    
    await prisma.$connect();
    console.log('✓ Connection established!');
    
    const result = await prisma.user.findFirst();
    console.log('✓ Query successful!');
    console.log('Result:', result ? 'Found user' : 'No user found');
    
    return true;
  } catch (error: any) {
    console.error('✗ Connection failed:');
    console.error('Error code:', error.code);
    console.error('Message:', error.message);
    return false;
  } finally {
    await prisma.$disconnect();
  }
}

async function main() {
  console.log('=== Neon Database Connection Test ===\n');
  
  const directSuccess = await testDirectConnection();
  const poolerSuccess = await testPoolerConnection();
  
  console.log('\n=== Summary ===');
  console.log('Direct connection:', directSuccess ? '✓ SUCCESS' : '✗ FAILED');
  console.log('Pooler connection:', poolerSuccess ? '✓ SUCCESS' : '✗ FAILED');
  
  if (!directSuccess && !poolerSuccess) {
    console.log('\n⚠ Both connections failed. Possible causes:');
    console.log('  1. Database is paused (Neon free tier auto-pauses)');
    console.log('  2. Network/firewall blocking connections');
    console.log('  3. Invalid credentials or expired database');
    console.log('\n💡 Solution: Visit Neon dashboard to wake up the database');
  }
}

main();
