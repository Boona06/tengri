import express from "express";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { rateLimit } from "express-rate-limit";
import { prisma } from "../lib/prisma.ts";
import { discount } from "./operations.ts";
import {
  paymentMode,
  qpay,
  invoiceSchema,
  verifiedAmount,
} from "../lib/qpay.ts";
const cookie = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: 365 * 86400000,
};
export async function visitor(req: express.Request, res: express.Response) {
  let id = "";
  try {
    const p = jwt.verify(
      req.cookies?.tenger_visitor || "",
      process.env.ADMIN_SESSION_SECRET!,
    );
    if (typeof p !== "string" && p.role === "visitor") id = p.sub || "";
  } catch {}
  if (id && (await prisma.visitor.findUnique({ where: { id } }))) return id;
  const v = await prisma.visitor.create({ data: {} });
  res.cookie(
    "tenger_visitor",
    jwt.sign({ role: "visitor" }, process.env.ADMIN_SESSION_SECRET!, {
      subject: v.id,
      expiresIn: "365d",
    }),
    cookie,
  );
  return v.id;
}
export const lock = async (
  tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
  id: string,
) => {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${id}))`;
};
export function createJourneyRouter() {
  const r = express.Router();
  r.use(
    rateLimit({
      windowMs: 60000,
      limit: 90,
      standardHeaders: "draft-8",
      legacyHeaders: false,
    }),
  );
  r.use((_q, s, n) => {
    s.setHeader("Cache-Control", "no-store");
    n();
  });
  r.get("/session", async (q, s) => {
    const id = await visitor(q, s);
    const day = new Date(Date.now() + 8 * 3600000).toISOString().slice(0, 10);
    await prisma.visit.upsert({
      where: { visitorId_day: { visitorId: id, day } },
      create: { visitorId: id, day },
      update: {},
    });
    const settings = await prisma.siteSettings.upsert({
      where: { id: "main" },
      create: { id: "main" },
      update: {},
    });
    const selections = await prisma.selection.findMany({
      where: { visitorId: id, unlocked: true },
      select: { contentId: true, answer: true },
    });
    s.json({
      success: true,
      data: { settings, selections, mode: paymentMode() },
    });
  });
  r.post("/select", async (q, s) => {
    const id = await visitor(q, s);
    const d = z
      .object({ contentId: z.string(), answerId: z.string() })
      .parse(q.body);
    const selected = await prisma.$transaction(async (tx) => {
      await lock(tx, id);
      const old = await tx.selection.findUnique({
        where: {
          visitorId_contentId: { visitorId: id, contentId: d.contentId },
        },
      });
      if (old) return old;
      const a = await tx.answer.findFirst({
        where: {
          id: d.answerId,
          contentId: d.contentId,
          content: { status: "PUBLISHED" },
        },
        include: { content: true },
      });
      if (!a) throw Error("Карт олдсонгүй.");
      const settings = await tx.siteSettings.findUnique({
        where: { id: "main" },
      });
      const free =
        !!settings?.firstCardFree &&
        (await tx.selection.count({ where: { visitorId: id, free: true } })) ===
          0;
      return tx.selection.create({
        data: {
          visitorId: id,
          contentId: d.contentId,
          answerId: a.id,
          title: a.content.title,
          answer: {
            id: a.id,
            text: a.text,
            imageUrl: a.imageUrl,
            iconName: a.iconName,
            visualType: a.visualType,
            nextContentId: a.nextContentId,
          },
          free,
          unlocked: free,
        },
      });
    });
    s.status(selected.unlocked ? 200 : 402).json({
      success: selected.unlocked,
      data: selected.unlocked ? selected.answer : { selectionId: selected.id },
    });
  });
  r.post("/invoice", async (q, s) => {
    const id = await visitor(q, s);
    const d = z
      .object({
        selectionId: z.string(),
        coupon: z.string().trim().toUpperCase().max(30).optional(),
      })
      .parse(q.body);
    const mode = paymentMode();
    const p = await prisma.$transaction(async (tx) => {
      await lock(tx, id);
      const selection = await tx.selection.findFirst({
        where: { id: d.selectionId, visitorId: id },
      });
      if (!selection || selection.unlocked)
        throw Error("Сонголт олдсонгүй эсвэл нээгдсэн байна.");
      const old = await tx.payment.findFirst({
        where: {
          selectionId: selection.id,
          status: { in: ["PENDING", "CREATING"] },
          expiresAt: { gt: new Date() },
        },
      });
      if (old) return { ...old, createInvoice: false };
      const settings = await tx.siteSettings.findUniqueOrThrow({
        where: { id: "main" },
      });
      let amount = settings.cardPriceMnt;
      let code: string | undefined;
      if (d.coupon) {
        await lock(tx, "coupon:" + d.coupon);
        const c = await tx.coupon.findUnique({ where: { code: d.coupon } });
        if (!c || !c.active || c.expiresAt < new Date())
          throw Error("Купон хүчингүй эсвэл хугацаа дууссан.");
        const reserved = await tx.payment.count({
          where: {
            couponCode: c.code,
            status: { in: ["PENDING", "CREATING"] },
            expiresAt: { gt: new Date() },
          },
        });
        if (c.used + reserved >= c.maxUses)
          throw Error("Купоны ашиглах хязгаар дууссан.");
        amount = discount(amount, c.kind, c.value);
        code = c.code;
      }
      if (amount > 0 && mode === "disabled")
        throw Error("Төлбөр хараахан нээгдээгүй байна.");
      const p = await tx.payment.create({
        data: {
          selectionId: selection.id,
          originalAmount: settings.cardPriceMnt,
          amount,
          couponCode: code,
          mode: amount === 0 ? "coupon" : mode,
          status:
            amount === 0
              ? "PAID"
              : mode === "live" || mode === "sandbox"
                ? "CREATING"
                : "PENDING",
          expiresAt: new Date(Date.now() + 30 * 60000),
          paidAt: amount === 0 ? new Date() : null,
        },
      });
      if (amount === 0) {
        await tx.selection.update({
          where: { id: selection.id },
          data: { unlocked: true },
        });
        if (code)
          await tx.coupon.update({
            where: { code },
            data: { used: { increment: 1 } },
          });
      }
      return { ...p, createInvoice: true };
    });
    if (p.createInvoice && p.status === "CREATING" && !p.invoiceId) {
      try {
        const callback = process.env.QPAY_CALLBACK_BASE_URL;
        if (!callback || !process.env.QPAY_INVOICE_CODE)
          throw Error("QPay тохиргоо дутуу.");
        const data = invoiceSchema.parse(
          await qpay("/v2/invoice", {
            invoice_code: process.env.QPAY_INVOICE_CODE,
            sender_invoice_no: p.id,
            invoice_receiver_code: p.selectionId,
            invoice_description: "TENGER ATLS карт",
            amount: p.amount,
            callback_url:
              callback.replace(/\/$/, "") + "/api/journey/callback/" + p.id,
          }),
        );
        await prisma.payment.update({
          where: { id: p.id },
          data: {
            invoiceId: data.invoice_id,
            providerData: data,
            status: "PENDING",
          },
        });
      } catch {
        await prisma.payment.update({
          where: { id: p.id },
          data: { status: "FAILED" },
        });
        throw Error("Нэхэмжлэх үүсгэж чадсангүй.");
      }
    }
    const updated = await prisma.payment.findUniqueOrThrow({
      where: { id: p.id },
    });
    s.json({
      success: true,
      data: {
        id: updated.id,
        amount: updated.amount,
        mode: updated.mode,
        status: updated.status,
        expiresAt: updated.expiresAt,
        providerData: updated.providerData,
      },
    });
  });
  r.post("/payment/:id/check", async (q, s) => {
    const visitorId = await visitor(q, s);
    const p = await prisma.payment.findFirst({
      where: { id: String(q.params.id), selection: { visitorId } },
    });
    if (!p) {
      s.status(404).json({ success: false });
      return;
    }
    await checkPayment(p.id);
    const selection = await prisma.selection.findUniqueOrThrow({
      where: { id: p.selectionId },
    });
    s.json({
      success: true,
      data: {
        unlocked: selection.unlocked,
        answer: selection.unlocked ? selection.answer : null,
        status: (
          await prisma.payment.findUniqueOrThrow({ where: { id: p.id } })
        ).status,
      },
    });
  });
  r.get("/callback/:id", async (q, s) => {
    await checkPayment(String(q.params.id));
    s.json({ success: true });
  });
  return r;
}
export async function settle(id: string, mock = false) {
  return prisma.$transaction(async (tx) => {
    await lock(tx, "payment:" + id);
    const p = await tx.payment.findUniqueOrThrow({ where: { id } });
    if (p.status === "PAID") return;
    if (
      p.status !== "PENDING" ||
      (mock && (p.mode !== "mock" || p.expiresAt < new Date()))
    )
      throw Error("Нэхэмжлэхийн төлөв буруу.");
    await tx.payment.update({
      where: { id },
      data: { status: "PAID", paidAt: new Date() },
    });
    await tx.selection.update({
      where: { id: p.selectionId },
      data: { unlocked: true },
    });
    if (p.couponCode)
      await tx.coupon.update({
        where: { code: p.couponCode },
        data: { used: { increment: 1 } },
      });
  });
}
async function checkPayment(id: string) {
  const p = await prisma.payment.findUnique({ where: { id } });
  if (!p || p.status === "PAID" || p.status === "FAILED") return;
  if ((p.mode === "live" || p.mode === "sandbox") && p.invoiceId) {
    const data = await qpay("/v2/payment/check", {
      object_type: "INVOICE",
      object_id: p.invoiceId,
      offset: { page_number: 1, page_limit: 100 },
    });
    if (verifiedAmount(data) >= p.amount) {
      await prisma.payment.updateMany({
        where: { id, status: "EXPIRED" },
        data: { status: "PENDING" },
      });
      await settle(id);
      return;
    }
  }
  if (p.expiresAt < new Date())
    await prisma.payment.updateMany({
      where: { id, status: "PENDING" },
      data: { status: "EXPIRED" },
    });
}
