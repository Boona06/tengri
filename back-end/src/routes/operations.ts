import express from "express";
import type { RequestHandler } from "express";
import { z } from "zod";
import { hash, compare } from "bcryptjs";
import { prisma } from "../lib/prisma.ts";

export const settingsSchema = z.object({
  cardPriceMnt: z.number().int().min(0).max(1000000),
  firstCardFree: z.boolean(),
  siteName: z.string().trim().min(1).max(80),
});
export const couponSchema = z
  .object({
    code: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[A-Z0-9_-]{3,30}$/),
    kind: z.enum(["PERCENT", "FIXED"]),
    value: z.number().int().positive(),
    maxUses: z.number().int().min(1).max(1000000),
    expiresAt: z.iso.datetime(),
    active: z.boolean(),
  })
  .refine(
    (v) => v.kind !== "PERCENT" || v.value <= 100,
    "Хувь 100-аас их байж болохгүй.",
  );
export function discount(price: number, kind: string, value: number) {
  return Math.max(
    0,
    price - (kind === "PERCENT" ? Math.floor((price * value) / 100) : value),
  );
}
export const roles = ["ADMIN", "MODERATOR", "EDITOR"] as const;
export function ownerOnly(
  _req: express.Request,
  res: express.Response,
  next: express.NextFunction,
) {
  if (res.locals.admin?.role !== "ADMIN") {
    res
      .status(403)
      .json({ success: false, message: "Админ эрх шаардлагатай." });
    return;
  }
  next();
}
const audit = (adminId: string, action: string, target: string) =>
  prisma.auditLog.create({ data: { adminId, action, target } });
export function createOperationsRouter(auth: RequestHandler) {
  const r = express.Router();
  r.use(auth);
  r.use((_q, s, n) => {
    s.setHeader("Cache-Control", "no-store");
    n();
  });
  r.get("/settings", async (_q, s) =>
    s.json({
      success: true,
      data: await prisma.siteSettings.upsert({
        where: { id: "main" },
        create: { id: "main" },
        update: {},
      }),
    }),
  );
  r.put("/settings", ownerOnly, async (q, s) => {
    const d = settingsSchema.parse(q.body);
    await prisma.siteSettings.upsert({
      where: { id: "main" },
      create: { id: "main", ...d },
      update: d,
    });
    await audit(s.locals.admin.id, "SETTINGS", "main");
    s.json({ success: true });
  });
  r.get("/coupons", ownerOnly, async (_q, s) =>
    s.json({
      success: true,
      data: await prisma.coupon.findMany({
        orderBy: { createdAt: "desc" },
        take: 200,
      }),
    }),
  );
  r.post("/coupons", ownerOnly, async (q, s) => {
    const d = couponSchema.parse(q.body);
    if (new Date(d.expiresAt) <= new Date()) {
      s.status(400).json({
        success: false,
        message: "Дуусах хугацаа ирээдүйд байх ёстой.",
      });
      return;
    }
    const c = await prisma.coupon.create({ data: d });
    await audit(s.locals.admin.id, "COUPON_CREATE", c.id);
    s.status(201).json({ success: true, data: c });
  });
  r.patch("/coupons/:id", ownerOnly, async (q, s) => {
    const { active } = z.object({ active: z.boolean() }).parse(q.body);
    await prisma.coupon.update({
      where: { id: String(q.params.id) },
      data: { active },
    });
    await audit(s.locals.admin.id, "COUPON_STATUS", String(q.params.id));
    s.json({ success: true });
  });
  r.get("/team", ownerOnly, async (_q, s) =>
    s.json({
      success: true,
      data: await prisma.adminUser.findMany({
        select: {
          id: true,
          email: true,
          role: true,
          active: true,
          createdAt: true,
        },
        orderBy: { createdAt: "asc" },
      }),
    }),
  );
  r.post("/team", ownerOnly, async (q, s) => {
    const d = z
      .object({
        email: z.email().transform((v) => v.toLowerCase()),
        password: z.string().min(12).max(128),
        role: z.enum(roles),
      })
      .parse(q.body);
    const a = await prisma.adminUser.create({
      data: {
        email: d.email,
        passwordHash: await hash(d.password, 12),
        role: d.role,
      },
    });
    await audit(s.locals.admin.id, "TEAM_CREATE", a.id);
    s.status(201).json({ success: true });
  });
  r.patch("/team/:id", ownerOnly, async (q, s) => {
    const d = z
      .object({ role: z.enum(roles), active: z.boolean() })
      .parse(q.body);
    const id = String(q.params.id);
    if (id === s.locals.admin.id) {
      s.status(400).json({
        success: false,
        message: "Өөрийн эрхийг энэ хэсгээс өөрчилж болохгүй.",
      });
      return;
    }
    await prisma.adminUser.update({
      where: { id },
      data: { ...d, sessionVersion: { increment: 1 } },
    });
    await audit(s.locals.admin.id, "TEAM_UPDATE", id);
    s.json({ success: true });
  });
  r.post("/password", async (q, s) => {
    const d = z
      .object({
        current: z.string().min(1).max(128),
        password: z.string().min(12).max(128),
      })
      .parse(q.body);
    const a = await prisma.adminUser.findUniqueOrThrow({
      where: { id: s.locals.admin.id },
    });
    if (!(await compare(d.current, a.passwordHash))) {
      s.status(400).json({
        success: false,
        message: "Одоогийн нууц үг буруу байна.",
      });
      return;
    }
    await prisma.adminUser.update({
      where: { id: a.id },
      data: {
        passwordHash: await hash(d.password, 12),
        sessionVersion: { increment: 1 },
      },
    });
    await audit(a.id, "PASSWORD_CHANGE", a.id);
    s.json({ success: true });
  });
  r.get("/report", ownerOnly, async (q, s) => {
    const range = z
      .enum(["day", "month", "year"])
      .catch("month")
      .parse(q.query.range);
    const date = z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .catch(new Date(Date.now() + 8 * 3600000).toISOString().slice(0, 10))
      .parse(q.query.date);
    const [y, m, d] = date.split("-").map(Number);
    const start = new Date(
      Date.UTC(y, range === "year" ? 0 : m - 1, range === "day" ? d : 1) -
        8 * 3600000,
    );
    const end = new Date(
      Date.UTC(
        range === "year" ? y + 1 : y,
        range === "year" ? 0 : range === "month" ? m : m - 1,
        range === "day" ? d + 1 : 1,
      ) -
        8 * 3600000,
    );
    const where = { createdAt: { gte: start, lt: end } };
    const [visits, payments, selections, contents] = await Promise.all([
      prisma.visit.findMany({ where, select: { visitorId: true, day: true } }),
      prisma.payment.findMany({
        where: { OR: [where, { paidAt: { gte: start, lt: end } }] },
        include: { selection: { select: { title: true } } },
        orderBy: { createdAt: "desc" },
      }),
      prisma.selection.findMany({
        where,
        select: { contentId: true, title: true, unlocked: true },
      }),
      prisma.content.count(),
    ]);
    const daily: Record<string, { visits: number; revenue: number }> = {};
    for (const v of visits) {
      daily[v.day] ??= { visits: 0, revenue: 0 };
      daily[v.day].visits++;
    }
    for (const p of payments) {
      const day = new Date((p.paidAt ?? p.createdAt).getTime() + 8 * 3600000)
        .toISOString()
        .slice(0, 10);
      daily[day] ??= { visits: 0, revenue: 0 };
      if (p.status === "PAID" && p.mode === "live" && p.paidAt && p.paidAt >= start && p.paidAt < end)
        daily[day].revenue += p.amount;
    }
    const top: Record<string, { title: string; count: number }> = {};
    for (const a of selections) {
      top[a.contentId] ??= { title: a.title, count: 0 };
      top[a.contentId].count++;
    }
    s.json({
      success: true,
      data: {
        visitors: new Set(visits.map((v) => v.visitorId)).size,
        visits: visits.length,
        contents,
        unlocked: selections.filter((v) => v.unlocked).length,
        revenue: payments
          .filter((p) => p.status === "PAID" && p.mode === "live" && p.paidAt && p.paidAt >= start && p.paidAt < end)
          .reduce((a, p) => a + p.amount, 0),
        paid: payments.filter((p) => p.status === "PAID" && p.mode === "live" && p.paidAt && p.paidAt >= start && p.paidAt < end)
          .length,
        payments,
        daily: Object.entries(daily)
          .sort()
          .map(([day, v]) => ({ day, ...v })),
        top: Object.values(top)
          .sort((a, b) => b.count - a.count)
          .slice(0, 10),
      },
    });
  });
  r.get("/audit", ownerOnly, async (_q, s) =>
    s.json({
      success: true,
      data: await prisma.auditLog.findMany({
        orderBy: { createdAt: "desc" },
        take: 100,
      }),
    }),
  );
  return r;
}
