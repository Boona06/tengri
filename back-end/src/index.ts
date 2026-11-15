import "dotenv/config";
import express from "express";
import cors from "cors";
import { prisma} from "./lib/prisma.ts";

const app = express();

const PORT = Number(process.env.PORT || 4000);

app.use(
  cors({
    origin: process.env.FRONTEND_ORIGIN || "http://localhost:3000",
  }),
);

app.use(express.json({ limit: "1mb" }));

// Backend болон Database шалгах
app.get("/api/health", async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;

    res.json({
      success: true,
      backend: "OK",
      database: "CONNECTED",
      message: "TENGER ATLS ажиллаж байна",
    });
  } catch {
    res.status(503).json({
      success: false,
      backend: "OK",
      database: "DISCONNECTED",
    });
  }
});

// Нийтлэгдсэн картуудыг авах
app.get("/api/contents", async (_req, res) => {
  try {
    const contents = await prisma.content.findMany({
      where: {
        status: "PUBLISHED",
      },
      orderBy: {
        sortOrder: "asc",
      },
      select: {
        id: true,
        type: true,
        title: true,
        question: true,
        visualType: true,
        imageUrl: true,
        iconName: true,
        sortOrder: true,
      },
    });

    res.json({
      success: true,
      count: contents.length,
      data: contents,
    });
  } catch {
    res.status(500).json({
      success: false,
      message: "Контент уншихад алдаа гарлаа",
    });
  }
});

app.use((_req, res) => {
  res.status(404).json({
    success: false,
    message: "API олдсонгүй",
  });
});

app.listen(PORT, () => {
  console.log("================================");
  console.log("TENGER ATLS BACKEND");
  console.log(`http://localhost:${PORT}`);
  console.log("================================");
});
