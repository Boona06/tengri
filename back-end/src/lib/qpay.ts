import { z } from "zod";
let token = "",
  expires = 0;
export function paymentMode() {
  return process.env.PAYMENT_MODE === "live"
    ? process.env.QPAY_BASE_URL === "https://merchant.qpay.mn"
      ? "live"
      : "sandbox"
    : process.env.PAYMENT_MODE === "mock"
      ? "mock"
      : "disabled";
}
async function auth() {
  if (token && expires > Date.now() + 60000) return token;
  const client = process.env.QPAY_CLIENT_ID,
    secret = process.env.QPAY_CLIENT_SECRET;
  if (!client || !secret) throw Error("QPay тохируулаагүй байна.");
  const r = await fetch(base() + "/v2/auth/token", {
    method: "POST",
    headers: {
      Authorization:
        "Basic " + Buffer.from(client + ":" + secret).toString("base64"),
    },
    signal: AbortSignal.timeout(15000),
  });
  if (!r.ok) throw Error("QPay нэвтрэлт амжилтгүй.");
  const d = z
    .object({ access_token: z.string(), expires_in: z.number() })
    .parse(await r.json());
  token = d.access_token;
  expires = d.expires_in * 1000;
  return token;
}
function base() {
  const url = process.env.QPAY_BASE_URL || "https://merchant-sandbox.qpay.mn";
  if (
    !["https://merchant.qpay.mn", "https://merchant-sandbox.qpay.mn"].includes(
      url,
    )
  )
    throw Error("QPay API хаяг буруу.");
  return url;
}
export async function qpay(
  path: string,
  body: unknown,
  retry = true,
): Promise<unknown> {
  const r = await fetch(base() + path, {
    method: "POST",
    headers: {
      Authorization: "Bearer " + (await auth()),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(15000),
  });
  if ((r.status === 401 || r.status === 403) && retry) {
    token = "";
    return qpay(path, body, false);
  }
  if (!r.ok) throw Error("QPay хүсэлт амжилтгүй. Дахин оролдоно уу.");
  return r.json();
}
export const invoiceSchema = z.object({
  invoice_id: z.string(),
  qr_image: z.string(),
  urls: z
    .array(
      z.object({
        name: z.string(),
        description: z.string().optional(),
        link: z.string(),
      }),
    )
    .default([]),
});
export function verifiedAmount(data: unknown) {
  const d = z
    .object({
      rows: z.array(
        z.object({
          payment_id: z.string(),
          payment_status: z.string(),
          payment_amount: z.coerce.number(),
          payment_currency: z.string(),
        }),
      ),
    })
    .parse(data);
  const seen = new Set<string>();
  return d.rows.reduce((sum, p) => {
    if (
      seen.has(p.payment_id) ||
      p.payment_status !== "PAID" ||
      p.payment_currency !== "MNT" ||
      !Number.isFinite(p.payment_amount) ||
      p.payment_amount < 0
    )
      return sum;
    seen.add(p.payment_id);
    return sum + p.payment_amount;
  }, 0);
}
