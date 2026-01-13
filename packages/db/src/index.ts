import { prisma } from '../prisma/prisma.config';

export { prisma } from '../prisma/prisma.config';
export * from "@prisma/client";

async function main() {
  const time = await prisma.$queryRaw`SELECT NOW()`;
  console.log("Database connection OK ✅", time);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error("Database connection failed ❌", e);
    process.exit(1);
  });

  