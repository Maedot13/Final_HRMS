import https from 'https';
import { PrismaClient } from '@prisma/client';

// Function to make HTTP request to wake the database
async function wakeDatabase(host: string): Promise<boolean> {
  return new Promise((resolve) => {
    const options = {
      hostname: host,
      port: 443,
      path: '/',
      method: 'GET',
      timeout: 10000,
      rejectUnauthorized: false
    };

    console.log(`Attempting to wake database via HTTPS: ${host}`);
    
    const req = https.request(options, (res) => {
      console.log(`Response status: ${res.statusCode}`);
      resolve(true);
    });

    req.on('error', (error) => {
      console.log(`HTTPS wake attempt: ${error.message}`);
      resolve(false);
    });

    req.on('timeout', () => {
      console.log('HTTPS request timed out');
      req.destroy();
      resolve(false);
    });

    req.end();
  });
}

// Function to attempt connection with retries
async function connectWithRetry(maxRetries = 5, delayMs = 3000): Promise<boolean> {
  const connectionString = process.env.DATABASE_URL || 
    "postgresql://neondb_owner:npg_o4yBeulSs9MK@ep-noisy-darkness-aio1cn7i-pooler.c-4.us-east-1.aws.neon.tech/neondb?sslmode=require";
  
  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: connectionString
      }
    }
  });

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`\nConnection attempt ${attempt}/${maxRetries}...`);
      
      await prisma.$connect();
      console.log('✓ Successfully connected to database!');
      
      const userCount = await prisma.user.count();
      console.log(`✓ Database is active. User count: ${userCount}`);
      
      await prisma.$disconnect();
      return true;
      
    } catch (error: any) {
      console.log(`✗ Attempt ${attempt} failed: ${error.message}`);
      
      if (attempt < maxRetries) {
        console.log(`Waiting ${delayMs/1000} seconds before retry...`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
  }
  
  await prisma.$disconnect();
  return false;
}

async function main() {
  console.log('=== Neon Database Wake-up Script ===\n');
  
  // Extract host from connection string
  const hosts = [
    'ep-noisy-darkness-aio1cn7i-pooler.c-4.us-east-1.aws.neon.tech',
    'ep-noisy-darkness-aio1cn7i.c-4.us-east-1.aws.neon.tech'
  ];
  
  // Try to wake the database
  console.log('Step 1: Attempting to wake database...\n');
  for (const host of hosts) {
    await wakeDatabase(host);
  }
  
  // Wait a bit for the database to start
  console.log('\nStep 2: Waiting for database to initialize...');
  await new Promise(resolve => setTimeout(resolve, 5000));
  
  // Try to connect with retries
  console.log('\nStep 3: Attempting to connect...');
  const success = await connectWithRetry(5, 3000);
  
  if (success) {
    console.log('\n✓✓✓ Database is now accessible! ✓✓✓');
    process.exit(0);
  } else {
    console.log('\n✗✗✗ Failed to connect to database ✗✗✗');
    console.log('\nPossible solutions:');
    console.log('1. Check if database exists in Neon dashboard');
    console.log('2. Verify credentials are correct');
    console.log('3. Check if your IP is whitelisted (if IP restrictions are enabled)');
    console.log('4. Try creating a new database connection string from Neon dashboard');
    process.exit(1);
  }
}

main();
