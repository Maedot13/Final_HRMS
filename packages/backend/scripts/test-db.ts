
import { PrismaClient } from '@prisma/client';

async function main() {
  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: "postgresql://neondb_owner:npg_o4yBeulSs9MK@ep-noisy-darkness-aio1cn7i-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require&pgbouncer=true&connect_timeout=30"
      }
    }
  });

  try {
    console.log('Attempting to connect to database (POOLER + PGBOUNCER)...');
    const result = await prisma.user.findFirst();
    console.log('Connection successful!');
    console.log('Result:', result ? 'Found user' : 'No user found');
  } catch (error) {
    console.error('Connection failed (POOLER + PGBOUNCER):');
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
