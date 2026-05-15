import { neon } from '@neondatabase/serverless';
import WebSocket from 'ws';

// Configure WebSocket for Node.js environment
if (typeof global.WebSocket === 'undefined') {
  (global as any).WebSocket = WebSocket;
}

async function testWithDetailedError() {
  const connectionString = process.env.DATABASE_URL || 
    "postgresql://neondb_owner:npg_o4yBeulSs9MK@ep-noisy-darkness-aio1cn7i-pooler.c-4.us-east-1.aws.neon.tech/neondb?sslmode=require";
  
  console.log('=== Detailed Neon Connection Test ===\n');

  try {
    const sql = neon(connectionString, {
      fetchOptions: {
        cache: 'no-store',
      },
    });
    
    console.log('Attempting connection...');
    const result = await sql`SELECT 1 as test`;
    
    console.log('✓✓✓ SUCCESS! ✓✓✓');
    console.log('Result:', result);
    return true;
    
  } catch (error: any) {
    console.error('✗ Connection failed');
    console.error('Full error:', error);
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    console.error('Error cause:', error.cause);
    
    if (error.cause) {
      console.error('Cause code:', error.cause.code);
      console.error('Cause message:', error.cause.message);
      console.error('Cause errno:', error.cause.errno);
      console.error('Cause syscall:', error.cause.syscall);
    }
    
    return false;
  }
}

// Also try direct HTTPS test to Neon API
async function testNeonAPI() {
  console.log('\n=== Testing Neon API Endpoint ===\n');
  
  const endpoints = [
    'https://ep-noisy-darkness-aio1cn7i-pooler.c-4.us-east-1.aws.neon.tech',
    'https://ep-noisy-darkness-aio1cn7i.c-4.us-east-1.aws.neon.tech',
    'https://console.neon.tech/api/v2/projects'
  ];
  
  for (const endpoint of endpoints) {
    try {
      console.log(`Testing: ${endpoint}`);
      const response = await fetch(endpoint, {
        method: 'GET',
        headers: { 'User-Agent': 'Node.js' }
      });
      console.log(`✓ Response: ${response.status} ${response.statusText}`);
    } catch (error: any) {
      console.log(`✗ Failed: ${error.message}`);
      if (error.cause) {
        console.log(`  Cause: ${error.cause.code} - ${error.cause.message}`);
      }
    }
    console.log();
  }
}

async function main() {
  await testWithDetailedError();
  await testNeonAPI();
}

main();
