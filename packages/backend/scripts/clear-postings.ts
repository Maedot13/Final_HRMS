import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  await prisma.jobApplication.deleteMany({});
  await prisma.jobPosting.deleteMany({});
  console.log('Deleted job postings and applications');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
