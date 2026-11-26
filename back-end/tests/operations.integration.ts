import "dotenv/config";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { prisma } from "../src/lib/prisma.ts";
const base = process.env.TEST_API_URL || "http://localhost:4100";
const marker = "QA-" + randomUUID().slice(0, 8);
const contentIds: string[] = [];
const visitorIds: string[] = [];
let teamId = "";
let couponId = "";
let original: unknown;
function client() {
  let cookie = "";
  return async (path: string, method = "GET", body?: unknown) => {
    const r = await fetch(base + path, {
      method,
      headers: { cookie, "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const set = r.headers.get("set-cookie");
    if (set) cookie = set.split(";")[0];
    return { status: r.status, body: await r.json() };
  };
}
const admin = client(),
  visitor = client(),
  stranger = client(),
  editor = client();
try {
  assert.equal(
    (
      await admin("/api/admin/login", "POST", {
        email: process.env.ADMIN_EMAIL,
        password: process.env.ADMIN_PASSWORD,
      })
    ).status,
    200,
  );
  original = (await admin("/api/admin/operations/settings")).body.data;
  assert.equal((await stranger("/api/admin/operations/settings")).status, 401);
  await admin("/api/admin/operations/settings", "PUT", {
    siteName: "TENGER ATLS",
    cardPriceMnt: 3000,
    firstCardFree: true,
  });
  for (let i = 0; i < 3; i++) {
    const r = await admin("/api/admin/contents", "POST", {
      type: "TOPIC",
      title: marker + " " + i,
      question: "Тестийн асуулт",
      visualType: "ICON",
      iconName: "✦",
      sortOrder: 999,
      status: "PUBLISHED",
      answers: [1, 2, 3].map((n) => ({
        text: marker + " answer " + n,
        visualType: "ICON",
        iconName: "✦",
      })),
    });
    assert.equal(r.status, 201);
    contentIds.push(r.body.data.id);
  }
  const session = await visitor("/api/journey/session");
  assert.equal(session.status, 200);
  const contents = (await admin("/api/admin/contents")).body.data.filter(
    (c: { id: string }) => contentIds.includes(c.id),
  );
  const choices = await Promise.all(
    contents
      .slice(0, 2)
      .map((c: { id: string; answers: { id: string }[] }) =>
        visitor("/api/journey/select", "POST", {
          contentId: c.id,
          answerId: c.answers[0].id,
        }),
      ),
  );
  assert.deepEqual(choices.map((r) => r.status).sort(), [200, 402]);
  const locked = choices.find((r) => r.status === 402)!.body.data.selectionId;
  const selection = await prisma.selection.findUniqueOrThrow({
    where: { id: locked },
  });
  visitorIds.push(selection.visitorId);
  const refresh = await visitor("/api/journey/session");
  assert.equal(refresh.body.data.selections.length, 1);
  const c = await admin("/api/admin/operations/coupons", "POST", {
    code: marker.toUpperCase(),
    kind: "PERCENT",
    value: 50,
    maxUses: 1,
    expiresAt: new Date(Date.now() + 86400000).toISOString(),
    active: true,
  });
  assert.equal(c.status, 201);
  couponId = c.body.data.id;
  const invoice = await visitor("/api/journey/invoice", "POST", {
    selectionId: locked,
    coupon: marker,
  });
  assert.equal(invoice.status, 200);
  assert.equal(invoice.body.data.amount, 1500);
  assert.equal(invoice.body.data.mode, "mock");
  const duplicate = await visitor("/api/journey/invoice", "POST", {
    selectionId: locked,
    coupon: marker,
  });
  assert.equal(duplicate.body.data.id, invoice.body.data.id);
  assert.equal(
    (
      await stranger(
        "/api/journey/payment/" + invoice.body.data.id + "/check",
        "POST",
        {},
      )
    ).status,
    404,
  );
  assert.equal(
    (
      await visitor(
        "/api/admin/payments/" + invoice.body.data.id + "/mock-confirm",
        "POST",
        {},
      )
    ).status,
    401,
  );
  assert.equal(
    (
      await admin(
        "/api/admin/payments/" + invoice.body.data.id + "/mock-confirm",
        "POST",
        {},
      )
    ).status,
    200,
  );
  assert.equal(
    (
      await admin(
        "/api/admin/payments/" + invoice.body.data.id + "/mock-confirm",
        "POST",
        {},
      )
    ).status,
    200,
  );
  const checked = await visitor(
    "/api/journey/payment/" + invoice.body.data.id + "/check",
    "POST",
    {},
  );
  assert.equal(checked.body.data.unlocked, true);
  assert.equal(
    (await prisma.coupon.findUniqueOrThrow({ where: { id: couponId } })).used,
    1,
  );
  const third = await visitor("/api/journey/select", "POST", {
    contentId: contents[2].id,
    answerId: contents[2].answers[0].id,
  });
  assert.equal(third.status, 402);
  assert.equal(
    (
      await visitor("/api/journey/invoice", "POST", {
        selectionId: third.body.data.selectionId,
        coupon: marker,
      })
    ).status,
    400,
  );
  const email = marker.toLowerCase() + "@example.invalid",
    password = randomUUID() + randomUUID();
  assert.equal(
    (
      await admin("/api/admin/operations/team", "POST", {
        email,
        password,
        role: "EDITOR",
      })
    ).status,
    201,
  );
  teamId = (await prisma.adminUser.findUniqueOrThrow({ where: { email } })).id;
  assert.equal(
    (await editor("/api/admin/login", "POST", { email, password })).status,
    200,
  );
  assert.equal((await editor("/api/admin/operations/report")).status, 403);
  assert.equal(
    (await editor("/api/admin/contents/" + contentIds[0], "DELETE")).status,
    403,
  );
  await admin("/api/admin/operations/team/" + teamId, "PATCH", {
    role: "EDITOR",
    active: false,
  });
  assert.equal((await editor("/api/admin/me")).status, 401);
  assert.equal(
    (
      await visitor(
        "/api/contents/" +
          contentIds[0] +
          "/answers/" +
          contents[0].answers[0].id +
          "/reveal",
        "POST",
        {},
      )
    ).status,
    410,
  );
  const report = await admin(
    "/api/admin/operations/report?range=day&date=" +
      new Date(Date.now() + 8 * 3600000).toISOString().slice(0, 10),
  );
  assert.equal(report.status, 200);
  assert.ok(
    report.body.data.payments.some(
      (p: { id: string }) => p.id === invoice.body.data.id,
    ),
  );
  console.log(
    "PASS: settings, role enforcement/revocation, concurrent free selection, paid lock, coupon limit, invoice idempotency, ownership, mock confirmation, refresh, reporting, legacy leak blocked.",
  );
} finally {
  if (original) await admin("/api/admin/operations/settings", "PUT", original);
  const selections = await prisma.selection.findMany({
    where: { contentId: { in: contentIds } },
    select: { id: true, visitorId: true },
  });
  visitorIds.push(...selections.map((s) => s.visitorId));
  await prisma.payment.deleteMany({
    where: { selectionId: { in: selections.map((s) => s.id) } },
  });
  await prisma.selection.deleteMany({
    where: { contentId: { in: contentIds } },
  });
  await prisma.content.deleteMany({ where: { id: { in: contentIds } } });
  if (couponId) await prisma.coupon.delete({ where: { id: couponId } });
  if (teamId) await prisma.adminUser.delete({ where: { id: teamId } });
  await prisma.visit.deleteMany({ where: { visitorId: { in: visitorIds } } });
  await prisma.visitor.deleteMany({ where: { id: { in: visitorIds } } });
  await prisma.$disconnect();
}
