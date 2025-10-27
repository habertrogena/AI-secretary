import { PrismaClient } from "@prisma/client";

export const prisma = new PrismaClient();

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

  