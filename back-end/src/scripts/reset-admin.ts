import "dotenv/config";
import { hash } from "bcryptjs";
import { prisma } from "../lib/prisma.ts";

async function main() {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;

  if (!email || !password || password.length < 12) {
    throw new Error(
      "ADMIN_EMAIL болон 12+ тэмдэгттэй ADMIN_PASSWORD оруулна уу.",
    );
  }

  const passwordHash = await hash(password, 12);

  const admins = await prisma.adminUser.findMany({
    select: { id: true },
    take: 2,
  });

  if (admins.length > 1) {
    throw new Error(
      "Нэгээс олон Admin байна. Аль хэрэглэгчийг шинэчлэхээ сонгох шаардлагатай.",
    );
  }

  if (admins.length === 1) {
    await prisma.adminUser.update({
      where: { id: admins[0].id },
      data: { email, passwordHash },
    });
  } else {
    await prisma.adminUser.create({
      data: { email, passwordHash },
    });
  }

  console.log("Admin нэвтрэх мэдээлэл амжилттай тохируулагдлаа!");
}

main()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
