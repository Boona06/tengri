import "dotenv/config";
import { hash } from "bcryptjs";
import { prisma } from "../lib/prisma.ts";

async function main() {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;

  if (!email || !password || password.length < 12) {
    throw new Error(
      "ADMIN_EMAIL болон 12+ тэмдэгттэй ADMIN_PASSWORD шаардлагатай.",
    );
  }

  const existing = await prisma.adminUser.findUnique({
    where: { email },
  });

  if (existing) {
    console.log("Admin хэрэглэгч аль хэдийн бүртгэгдсэн.");
    return;
  }

  const passwordHash = await hash(password, 12);

  await prisma.adminUser.create({
    data: {
      email,
      passwordHash,
    },
  });

  console.log("Admin хэрэглэгч амжилттай үүслээ.");
}

main()
  .catch((error) => {
    console.error("Admin үүсгэхэд алдаа гарлаа:", error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
