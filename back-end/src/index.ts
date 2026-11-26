import "dotenv/config";

import express from "express";
import type { Request, Response, NextFunction } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import jwt from "jsonwebtoken";
import { compare } from "bcryptjs";
import { rateLimit } from "express-rate-limit";
import { z } from "zod";
import { createOperationsRouter, ownerOnly } from "./routes/operations.ts";
import { createJourneyRouter, settle } from "./routes/journey.ts";

import { prisma } from "./lib/prisma.ts";
import { createAdminContentsRouter } from "./routes/admin-contents.ts";
import { createPublicContentsRouter } from "./routes/public-contents.ts";

const app = express();
if (process.env.VERCEL) app.set("trust proxy", 1);

const PORT = Number(process.env.PORT || 4000);
const isProduction = process.env.NODE_ENV === "production";

const sessionSecret: string = process.env.ADMIN_SESSION_SECRET ?? "";

if (sessionSecret.length < 32) {
  throw new Error(
    "ADMIN_SESSION_SECRET хамгийн багадаа 32 тэмдэгттэй байх ёстой.",
  );
}

const COOKIE_NAME = "tenger_admin";

// ========================================
// MIDDLEWARE
// ========================================

app.use(
  cors({
    origin: process.env.FRONTEND_ORIGIN || "http://localhost:3000",
    credentials: true,
  }),
);

app.use(express.json({ limit: "1mb" }));

app.use(cookieParser());
app.use((req, res, next) => {
  const origin = req.get("origin");
  if (
    !["GET", "HEAD", "OPTIONS"].includes(req.method) &&
    origin &&
    origin !== (process.env.FRONTEND_ORIGIN || "http://localhost:3000")
  ) {
    res
      .status(403)
      .json({
        success: false,
        message: "Хүсэлтийн эх сурвалж зөвшөөрөгдөөгүй.",
      });
    return;
  }
  next();
});

// ========================================
// COOKIE CONFIG
// ========================================

const cookieOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite: "lax" as const,
  path: "/",
};

// ========================================
// LOGIN VALIDATION
// ========================================

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,

  message: {
    success: false,
    message: "Хэт олон оролдлого хийлээ. Дараа дахин оролдоно уу.",
  },
});

// ========================================
// HEALTH CHECK
// ========================================

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

// ========================================
// PUBLIC CONTENT API
// ========================================

// Зөвхөн нийтлэгдсэн сэдэв, асуултыг харуулна.
// Төлбөртэй хариултын текст эндээс гарахгүй.

app.post("/api/contents/:contentId/answers/:answerId/reveal", (_req, res) => {
  res.status(410).json({ success: false, message: "Хуудсаа шинэчилнэ үү." });
});
app.use("/api/journey", createJourneyRouter());
app.use("/api/contents", createPublicContentsRouter(prisma));

// ========================================
// ADMIN LOGIN
// ========================================

app.post("/api/admin/login", loginLimiter, async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({
      success: false,
      message: "Email болон нууц үгээ зөв оруулна уу.",
    });
    return;
  }

  const { email, password } = parsed.data;

  try {
    const admin = await prisma.adminUser.findUnique({
      where: {
        email: email.trim().toLowerCase(),
      },
    });

    const valid = admin ? await compare(password, admin.passwordHash) : false;

    if (!admin || !admin.active || !valid) {
      res.status(401).json({
        success: false,
        message: "Email эсвэл нууц үг буруу байна.",
      });
      return;
    }

    const token = jwt.sign(
      { role: "admin", version: admin.sessionVersion },
      sessionSecret,
      {
        subject: admin.id,
        expiresIn: "12h",
      },
    );

    res.cookie(COOKIE_NAME, token, {
      ...cookieOptions,
      maxAge: 12 * 60 * 60 * 1000,
    });

    res.json({
      success: true,
      message: "Амжилттай нэвтэрлээ.",
      admin: {
        id: admin.id,
        email: admin.email,
      },
    });
  } catch {
    res.status(500).json({
      success: false,
      message: "Нэвтрэх үед алдаа гарлаа.",
    });
  }
});

// ========================================
// ADMIN AUTH MIDDLEWARE
// ========================================

async function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const token = req.cookies?.[COOKIE_NAME];

  if (!token) {
    res.status(401).json({
      success: false,
      message: "Нэвтрэх шаардлагатай.",
    });
    return;
  }

  try {
    const payload = jwt.verify(token, sessionSecret);

    if (
      typeof payload === "string" ||
      typeof payload.sub !== "string" ||
      payload.role !== "admin"
    ) {
      res.status(401).json({
        success: false,
        message: "Нэвтрэх эрх хүчингүй.",
      });
      return;
    }

    const admin = await prisma.adminUser.findUnique({
      where: {
        id: payload.sub,
      },

      select: {
        id: true,
        email: true,
        role: true,
        active: true,
        sessionVersion: true,
      },
    });

    if (
      !admin ||
      !admin.active ||
      (payload.version ?? 0) !== admin.sessionVersion
    ) {
      res.status(401).json({
        success: false,
        message: "Admin хэрэглэгч олдсонгүй.",
      });
      return;
    }

    res.locals.admin = admin;

    next();
  } catch {
    res.status(401).json({
      success: false,
      message: "Нэвтрэх хугацаа дууссан эсвэл эрх хүчингүй.",
    });
  }
}

// ========================================
// ADMIN SESSION CHECK
// ========================================

app.get("/api/admin/me", requireAdmin, (_req, res) => {
  res.json({
    success: true,
    admin: res.locals.admin,
  });
});

// ========================================
// ADMIN LOGOUT
// ========================================

app.post("/api/admin/logout", (_req, res) => {
  res.clearCookie(COOKIE_NAME, cookieOptions);

  res.json({
    success: true,
    message: "Системээс гарлаа.",
  });
});

// ========================================
// ADMIN CONTENT MANAGEMENT
// ========================================

// Зөвхөн Admin нэвтэрсэн үед ашиглана.
//
// GET     /api/admin/contents
// GET     /api/admin/contents/:id
// POST    /api/admin/contents
// PUT     /api/admin/contents/:id
// DELETE  /api/admin/contents/:id

app.use("/api/admin/contents", createAdminContentsRouter(requireAdmin));
app.use("/api/admin/operations", createOperationsRouter(requireAdmin));
app.post(
  "/api/admin/payments/:id/mock-confirm",
  requireAdmin,
  ownerOnly,
  async (req, res) => {
    await settle(String(req.params.id), true);
    res.json({ success: true });
  },
);

// ========================================
// 404
// ========================================

app.use((_req, res) => {
  res.status(404).json({
    success: false,
    message: "API олдсонгүй.",
  });
});

// ========================================
// SERVER START
// ========================================

app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (error instanceof z.ZodError) {
    res
      .status(400)
      .json({
        success: false,
        message: "Мэдээллээ шалгана уу.",
        issues: error.issues,
      });
    return;
  }
  const code = (error as { code?: string })?.code;
  res
    .status(code === "P2002" ? 409 : 400)
    .json({
      success: false,
      message:
        code === "P2002"
          ? "Энэ мэдээлэл аль хэдийн бүртгэгдсэн байна."
          : error instanceof Error && /[А-Яа-яӨөҮү]/.test(error.message)
            ? error.message
            : "Үйлдлийг гүйцэтгэж чадсангүй.",
    });
});
app.listen(PORT, () => {
  console.log("================================");
  console.log("TENGER ATLS BACKEND");
  console.log(`http://localhost:${PORT}`);
  console.log("Admin Content API: READY");
  console.log("================================");
});
