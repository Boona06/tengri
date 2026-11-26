import test from "node:test";
import assert from "node:assert/strict";
import { discount, couponSchema } from "../src/routes/operations.ts";
import { verifiedAmount } from "../src/lib/qpay.ts";
test("coupon calculation is bounded, integer and validated", () => {
  assert.equal(discount(3000, "PERCENT", 25), 2250);
  assert.equal(discount(3000, "FIXED", 5000), 0);
  assert.equal(
    couponSchema.safeParse({
      code: "WELCOME",
      kind: "PERCENT",
      value: 101,
      maxUses: 1,
      expiresAt: new Date().toISOString(),
      active: true,
    }).success,
    false,
  );
});
test("QPay amount only includes unique paid MNT transactions", () => {
  assert.equal(
    verifiedAmount({
      rows: [
        {
          payment_id: "1",
          payment_status: "PAID",
          payment_amount: "1500",
          payment_currency: "MNT",
        },
        {
          payment_id: "1",
          payment_status: "PAID",
          payment_amount: "1500",
          payment_currency: "MNT",
        },
        {
          payment_id: "2",
          payment_status: "NEW",
          payment_amount: "9000",
          payment_currency: "MNT",
        },
        {
          payment_id: "3",
          payment_status: "PAID",
          payment_amount: "9000",
          payment_currency: "USD",
        },
      ],
    }),
    1500,
  );
});
