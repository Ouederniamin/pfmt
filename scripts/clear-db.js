const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();

async function main() {
  await db.question.deleteMany();
  await db.test.deleteMany();
  await db.page.deleteMany();
  await db.chapitre.deleteMany();
  console.log('All chapitres deleted');
  await db.$disconnect();
}

main();
