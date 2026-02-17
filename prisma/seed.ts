import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  // BRAND
  await prisma.brand.createMany({
    data: [
      { name: "Nike", slug: "nike" },
      { name: "Adidas", slug: "adidas" },
      { name: "Puma", slug: "puma" },
    ],
    skipDuplicates: true,
  });

  // MODEL SEPATU
  await prisma.shoeModel.createMany({
    data: [
      { name: "Running", slug: "running" },
      { name: "Casual", slug: "casual" },
      { name: "Basket", slug: "basket" },
    ],
    skipDuplicates: true,
  });

  // SIZE
  await prisma.size.createMany({
    data: [
      { value: 38 },
      { value: 39 },
      { value: 40 },
      { value: 41 },
      { value: 42 },
    ],
    skipDuplicates: true,
  });

  console.log("✅ Seed data berhasil");
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });