/**
 * Creates (or resets) the demo account with sample properties.
 *   Email: demo@dealan.app   Password: demo1234
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { sampleRowsFor } from "../src/lib/sample-data";

const prisma = new PrismaClient();

async function main() {
  const email = "demo@dealan.app";
  const passwordHash = await bcrypt.hash("demo1234", 10);
  const user = await prisma.user.upsert({
    where: { email },
    update: { passwordHash },
    create: { email, name: "Demo Investor", passwordHash },
  });
  await prisma.userSettings.deleteMany({ where: { userId: user.id } });
  await prisma.userSettings.create({ data: { userId: user.id } });
  // Reset the demo to a clean state: only the sample properties.
  await prisma.property.deleteMany({ where: { userId: user.id, isSample: false } });
  await prisma.property.deleteMany({ where: { userId: user.id, isSample: true } });
  await prisma.property.createMany({ data: sampleRowsFor(user.id) });
  console.log(`Seeded ${email} with sample properties.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
