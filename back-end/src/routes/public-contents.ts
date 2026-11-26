import express from "express";
import type { PrismaClient } from "../generated/prisma/client.ts";

// Keep answer text out of the catalogue; fetch only the selected answer.
// This preserves the existing demo flow. QPay entitlement checks are not implemented.
export function createPublicContentsRouter(
  db: Pick<PrismaClient, "content" | "answer">,
) {
  const router = express.Router();
  router.use((_req, res, next) => {
    res.setHeader("Cache-Control", "no-store");
    next();
  });

  router.get("/", async (_req, res) => {
    try {
      const data = await db.content.findMany({
        where: { status: "PUBLISHED" },
        orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
        select: {
          id: true, type: true, title: true, question: true,
          visualType: true, imageUrl: true, iconName: true, sortOrder: true,
          answers: {
            orderBy: { position: "asc" },
            select: {
              id: true, position: true, visualType: true,
              nextContentId: true,
              imageUrl: true, iconName: true,
            },
          },
        },
      });
      res.json({ success: true, count: data.length, data });
    } catch {
      res.status(500).json({ success: false, message: "Контент уншихад алдаа гарлаа." });
    }
  });

  router.post("/:contentId/answers/:answerId/reveal", async (req, res) => {
    const contentId = req.params.contentId as string;
    const answerId = req.params.answerId as string;
    try {
      const answer = await db.answer.findFirst({
        where: { id: answerId, contentId, content: { status: "PUBLISHED" } },
        select: { id: true, text: true, visualType: true, imageUrl: true, iconName: true },
      });
      if (!answer) {
        res.status(404).json({ success: false, message: "Карт олдсонгүй. Нүүр хуудсаа шинэчилнэ үү." });
        return;
      }
      res.json({ success: true, data: answer });
    } catch {
      res.status(500).json({ success: false, message: "Хариулт уншихад алдаа гарлаа. Дахин оролдоно уу." });
    }
  });
  return router;
}
