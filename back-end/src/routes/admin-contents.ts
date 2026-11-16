import express from "express";
import type { RequestHandler } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.ts";

const visualSchema = z.object({
  visualType: z.enum(["IMAGE", "ICON"]),
  imageUrl: z.string().trim().max(2048).nullable().optional(),
  iconName: z.string().trim().max(100).nullable().optional(),
});

const answerSchema = visualSchema.extend({
  text: z.string().trim().min(1).max(5000),
});

const contentSchema = visualSchema
  .extend({
    type: z.enum(["TOPIC", "QUESTION"]),
    title: z.string().trim().min(1).max(150),
    question: z.string().trim().max(500).nullable().optional(),

    status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).default("DRAFT"),

    sortOrder: z.number().int().min(0).default(0),
    answers: z.array(answerSchema).length(3),
  })
  .superRefine((data, ctx) => {
    function checkVisual(
      item: {
        visualType: "IMAGE" | "ICON";
        imageUrl?: string | null;
        iconName?: string | null;
      },
      path: (string | number)[],
    ) {
      if (item.visualType === "IMAGE") {
        const url = item.imageUrl;

        let valid = false;

        if (url?.startsWith("/") && !url.startsWith("//")) {
          valid = true;
        } else if (url) {
          try {
            const parsed = new URL(url);
            valid = parsed.protocol === "https:" || parsed.protocol === "http:";
          } catch {
            valid = false;
          }
        }

        if (!valid) {
          ctx.addIssue({
            code: "custom",
            path: [...path, "imageUrl"],
            message: "Зөв зургийн URL шаардлагатай.",
          });
        }
      }

      if (item.visualType === "ICON" && !item.iconName?.trim()) {
        ctx.addIssue({
          code: "custom",
          path: [...path, "iconName"],
          message: "Icon сонгоно уу.",
        });
      }
    }

    checkVisual(data, []);

    data.answers.forEach((answer, index) => {
      checkVisual(answer, ["answers", index]);
    });

    if (data.type === "QUESTION" && !data.question?.trim()) {
      ctx.addIssue({
        code: "custom",
        path: ["question"],
        message: "Асуултын текст шаардлагатай.",
      });
    }
  });

type ContentInput = z.infer<typeof contentSchema>;

function getContentData(input: ContentInput) {
  return {
    type: input.type,
    title: input.title,
    question: input.question || null,
    visualType: input.visualType,
    imageUrl: input.visualType === "IMAGE" ? (input.imageUrl ?? null) : null,
    iconName: input.visualType === "ICON" ? (input.iconName ?? null) : null,
    status: input.status,
    sortOrder: input.sortOrder,
  };
}

function getAnswerData(answers: ContentInput["answers"]) {
  return answers.map((answer, index) => ({
    text: answer.text,
    position: index + 1,
    visualType: answer.visualType,
    imageUrl: answer.visualType === "IMAGE" ? (answer.imageUrl ?? null) : null,
    iconName: answer.visualType === "ICON" ? (answer.iconName ?? null) : null,
  }));
}

function validationError(error: z.ZodError) {
  return {
    success: false,
    message: "Оруулсан мэдээллээ шалгана уу.",
    errors: error.issues.map((issue) => ({
      field: issue.path.join("."),
      message: issue.message,
    })),
  };
}

export function createAdminContentsRouter(requireAdmin: RequestHandler) {
  const router = express.Router();

  // Бүх endpoint зөвхөн нэвтэрсэн админд
  router.use(requireAdmin);

  // Бүх контент
  router.get("/", async (_req, res) => {
    try {
      const contents = await prisma.content.findMany({
        orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
        include: {
          answers: {
            orderBy: { position: "asc" },
          },
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
        message: "Контент уншихад алдаа гарлаа.",
      });
    }
  });

  // Нэг контентийн мэдээлэл
  router.get("/:id", async (req, res) => {
    try {
      const content = await prisma.content.findUnique({
        where: { id: req.params.id as string },
        include: {
          answers: {
            orderBy: { position: "asc" },
          },
        },
      });

      if (!content) {
        res.status(404).json({
          success: false,
          message: "Контент олдсонгүй.",
        });
        return;
      }

      res.json({ success: true, data: content });
    } catch {
      res.status(500).json({
        success: false,
        message: "Контент уншихад алдаа гарлаа.",
      });
    }
  });

  // Шинэ сэдэв эсвэл асуулт нэмэх
  router.post("/", async (req, res) => {
    const parsed = contentSchema.safeParse(req.body);

    if (!parsed.success) {
      res.status(400).json(validationError(parsed.error));
      return;
    }

    try {
      const data = parsed.data;

      const content = await prisma.content.create({
        data: {
          ...getContentData(data),
          answers: {
            create: getAnswerData(data.answers),
          },
        },
        include: {
          answers: {
            orderBy: { position: "asc" },
          },
        },
      });

      res.status(201).json({
        success: true,
        message: "Контент амжилттай нэмэгдлээ.",
        data: content,
      });
    } catch {
      res.status(500).json({
        success: false,
        message: "Контент нэмэхэд алдаа гарлаа.",
      });
    }
  });

  // Контент болон 3 хариултыг засах
  router.put("/:id", async (req, res) => {
    const parsed = contentSchema.safeParse(req.body);

    if (!parsed.success) {
      res.status(400).json(validationError(parsed.error));
      return;
    }

    const id = req.params.id as string;

    try {
      const existing = await prisma.content.findUnique({
        where: { id },
        select: { id: true },
      });

      if (!existing) {
        res.status(404).json({
          success: false,
          message: "Контент олдсонгүй.",
        });
        return;
      }

      const data = parsed.data;

      const updated = await prisma.$transaction(async (tx) => {
        await tx.answer.deleteMany({
          where: { contentId: id },
        });

        return tx.content.update({
          where: { id },
          data: {
            ...getContentData(data),
            answers: {
              create: getAnswerData(data.answers),
            },
          },
          include: {
            answers: {
              orderBy: { position: "asc" },
            },
          },
        });
      });

      res.json({
        success: true,
        message: "Контент амжилттай шинэчлэгдлээ.",
        data: updated,
      });
    } catch {
      res.status(500).json({
        success: false,
        message: "Контент шинэчлэхэд алдаа гарлаа.",
      });
    }
  });

  // Контент устгах
  router.delete("/:id", async (req, res) => {
    try {
      const result = await prisma.content.deleteMany({
        where: { id: req.params.id as string },
      });

      if (result.count === 0) {
        res.status(404).json({
          success: false,
          message: "Контент олдсонгүй.",
        });
        return;
      }

      res.json({
        success: true,
        message: "Контент устгагдлаа.",
      });
    } catch {
      res.status(500).json({
        success: false,
        message: "Контент устгахад алдаа гарлаа.",
      });
    }
  });

  return router;
}
