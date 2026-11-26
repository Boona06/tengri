import { expect, test, type Page } from "@playwright/test";

// Test-only fixtures; never imported by application code or inserted in the real database.
function catalogue(count = 12) {
  return Array.from({ length: count }, (_, i) => ({
    id: `card-${i}`,
    type: i % 2 ? "QUESTION" : "TOPIC",
    title: `Тестийн карт ${i + 1}`,
    question: `Өөрийн хүсэл мөрөөдлөө хэрхэн ойлгох вэ? ${i + 1}`,
    visualType: "IMAGE",
    imageUrl: `/cards/card-0${(i % 4) + 1}.jpg`,
    backImageUrl: "/cards/card-04.jpg",
    iconName: `${i + 1}`,
    answers: [1, 2, 3].map((n) => ({
      id: `${i}-answer-${n}`,
      position: n,
      nextContentId: i + 1 < count ? `card-${i + 1}` : null,
      visualType: n === 2 ? "ICON" : "IMAGE",
      iconName: n === 2 ? "♡" : null,
      imageUrl: n === 2 ? null : `/cards/card-0${n}.jpg`,
      backImageUrl: "/cards/card-04.jpg",
    })),
  }));
}
async function mockApi(
  page: Page,
  options: { count?: number; delayed?: boolean; failReveal?: boolean } = {},
) {
  const state = {
    data: catalogue(options.count),
    revealed: [] as string[],
    fail: !!options.failReveal,
  };
  await page.route("http://localhost:4000/**", async (route) => {
    if (route.request().method() === "OPTIONS") {
      await route.fulfill({
        status: 204,
        headers: {
          "Access-Control-Allow-Origin": "http://127.0.0.1:3100",
          "Access-Control-Allow-Credentials": "true",
          "Access-Control-Allow-Headers": "Content-Type",
          "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        },
      });
      return;
    }
    const url = new URL(route.request().url());
    const headers = {
      "Access-Control-Allow-Origin": "http://127.0.0.1:3100",
      "Access-Control-Allow-Credentials": "true",
      "Access-Control-Allow-Headers": "Content-Type",
    };
    if (url.pathname === "/api/contents") {
      await route.fulfill({
        headers,
        json: { success: true, data: state.data },
      });
      return;
    }
    if (url.pathname === "/api/journey/session") {
      await route.fulfill({
        headers,
        json: {
          success: true,
          data: {
            settings: {
              siteName: "TENGER ATLS",
              cardPriceMnt: 3000,
              firstCardFree: true,
            },
            selections: [],
            mode: "mock",
          },
        },
      });
      return;
    }
    const payload = route.request().postDataJSON();
    const id = payload.answerId as string;
    if (!state.fail && state.revealed.length && !state.revealed.includes(id)) {
      await route.fulfill({
        headers,
        status: 402,
        json: { success: false, data: { selectionId: "locked-selection" } },
      });
      return;
    }
    state.revealed.push(id);
    if (options.delayed)
      await new Promise((resolve) => setTimeout(resolve, 1000));
    if (state.fail) {
      await route.fulfill({
        headers,
        status: 500,
        json: { success: false, message: "Хариулт уншиж чадсангүй." },
      });
      return;
    }
    const answer = state.data
      .flatMap((card) => card.answers)
      .find((item) => item.id === id);
    await route.fulfill({
      headers,
      json: {
        success: true,
        data: {
          ...answer,
          text: `БАТАЛГААТ ХАРИУЛТ ${id}\n` + "Өөртөө итгээрэй. ".repeat(65),
        },
      },
    });
  });
  return state;
}
async function openPicker(page: Page, name = "Тестийн карт 1 — карт сонгох") {
  const card = page.getByRole("button", { name, exact: true });
  await card.click();
  await expect(
    page.getByRole("dialog", { name: "Гурван хариултаас сонгох" }),
  ).toBeVisible();
  return card;
}

for (const viewport of [
  { width: 390, height: 844 },
  { width: 768, height: 1024 },
  { width: 1440, height: 900 },
]) {
  test(`12 API cards fit without overlap at ${viewport.width}px`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await mockApi(page, { count: 15 });
    await page.addInitScript(() => {
      Math.random = () => 0.25;
    });
    await page.goto("/");
    const buttons = page
      .getByRole("group", { name: "Зөгнөлт картууд" })
      .getByRole("button");
    await expect(buttons).toHaveCount(12);
    const labels = await buttons.allTextContents();
    expect(labels).not.toEqual(catalogue().map((item) => item.title));
    const boxes = await buttons.evaluateAll((elements) =>
      elements.map((el) => {
        const rect = el.getBoundingClientRect();
        return { x: rect.x, y: rect.y, w: rect.width, h: rect.height };
      }),
    );
    for (const [i, box] of boxes.entries()) {
      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.x + box.w).toBeLessThanOrEqual(viewport.width);
      for (const other of boxes.slice(i + 1))
        expect(
          box.x + box.w <= other.x ||
            other.x + other.w <= box.x ||
            box.y + box.h <= other.y ||
            other.y + other.h <= box.y,
        ).toBeTruthy();
    }
    await expect(page.locator("canvas")).toHaveCount(0);
    await page.getByRole("button", { name: "Илүү олон асуулт үзэх ↓" }).click();
    await expect(buttons).toHaveCount(15);
    await page.waitForLoadState("networkidle");
    await page.screenshot({
      path: `test-results/layout-${viewport.width}.png`,
      fullPage: true,
    });
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(viewport.width);
  });
}

for (const choice of [1, 2, 3]) {
  test(`choice ${choice} reveals its matching answer and restores focus`, async ({
    page,
  }) => {
    const api = await mockApi(page);
    if (choice === 1) await page.setViewportSize({ width: 390, height: 844 });
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto("/");
    const card = await openPicker(page);
    await expect(page.getByRole("dialog")).toHaveCSS("background-color", "rgb(245, 243, 237)");
    if (choice === 1) await page.screenshot({ path: "test-results/atlas-picker.png" });
    await expect(page.getByRole("dialog")).toContainText(
      "Өөрийн хүсэл мөрөөдлөө",
    );
    await page
      .getByRole("button", { name: `Нууц карт ${choice} сонгох`, exact: true })
      .click();
    const answer = page.getByRole("dialog", { name: "Таны хариулт" });
    await expect(answer).toBeVisible();
    if (choice === 1) {
      const toggle = answer.getByRole("button", { name: "Дэлгэрэнгүй ↓" });
      await expect(toggle).toHaveAttribute("aria-expanded", "false");
      await toggle.click();
      await expect(answer.getByRole("button", { name: "Хураах ↑" })).toHaveAttribute("aria-expanded", "true");
      await answer.getByRole("button", { name: "Хураах ↑" }).click();
    }
    expect(api.revealed).toHaveLength(1);
    await expect(answer.getByRole("region", { name: "Үргэлжлүүлэх асуултууд" })).toBeVisible();
    await expect(answer.locator(".atlas-next")).toHaveCount(11);
    if (choice === 1) await page.screenshot({ path: "test-results/atlas-answer.png" });
    await expect(answer).toContainText(`БАТАЛГААТ ХАРИУЛТ ${api.revealed[0]}`);
    await page.getByRole("button", { name: "Түр завсарлах" }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(card).toBeFocused();
    await card.press("Enter");
    await expect(
      page.getByRole("dialog", { name: "Таны хариулт" }),
    ).toBeVisible();
    expect(api.revealed).toHaveLength(1);
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toHaveCount(0);
    expect(errors).toEqual([]);
  });
}

test("second card stays locked without requesting its answer", async ({
  page,
}) => {
  const api = await mockApi(page);
  await page.goto("/");
  await openPicker(page);
  await page
    .getByRole("button", { name: "Нууц карт 1 сонгох", exact: true })
    .click();
  await expect(
    page.getByRole("dialog", { name: "Таны хариулт" }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await openPicker(page, "Тестийн карт 2 — карт сонгох");
  await page
    .getByRole("button", { name: "Нууц карт 2 сонгох", exact: true })
    .click();
  await expect(
    page.getByRole("dialog", { name: "Картын төлбөр" }),
  ).toContainText("3,000₮");
  await expect(
    page.getByRole("button", { name: "Нэхэмжлэх үүсгэх" }),
  ).toBeVisible();
  expect(api.revealed).toHaveLength(1);
});

test("failed reveal can retry; closing an in-flight request never reopens a modal", async ({
  page,
}) => {
  const api = await mockApi(page, { delayed: true, failReveal: true });
  await page.goto("/");
  await openPicker(page);
  await page
    .getByRole("button", { name: "Нууц карт 1 сонгох", exact: true })
    .click();
  await expect(page.getByRole("dialog").getByRole("alert")).toHaveText(
    "Хариулт уншиж чадсангүй.",
  );
  api.fail = false;
  await page
    .getByRole("button", { name: "Нууц карт 1 сонгох", exact: true })
    .click();
  await expect.poll(() => api.revealed.length).toBe(2);
  await page.keyboard.press("Escape");
  await page.waitForTimeout(1300); // Exceed the deliberately delayed response.
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

test("WebGL unavailable: accessible 2D cards, reduced motion and keyboard modal flow", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (
      this: HTMLCanvasElement,
      ...args: Parameters<typeof original>
    ) {
      if (String(args[0]).startsWith("webgl")) return null;
      return original.apply(this, args);
    } as typeof original;
  });
  await mockApi(page);
  await page.goto("/");

  await expect(page.locator("canvas")).toHaveCount(0);
  const card = page.getByRole("button", {
    name: "Тестийн карт 1 — карт сонгох",
    exact: true,
  });
  await card.focus();
  await card.press("Enter");
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  for (let i = 0; i < 8; i++) await page.keyboard.press("Tab");
  expect(
    await dialog.evaluate((el) => el.contains(document.activeElement)),
  ).toBe(true);
  await page.keyboard.press("Escape");
  await expect(card).toBeFocused();
});

test("answer leads to the configured next question without bypassing payment", async ({
  page,
}) => {
  await mockApi(page);
  await page.goto("/");
  await openPicker(page);
  await page
    .getByRole("button", { name: "Нууц карт 1 сонгох", exact: true })
    .click();
  await expect(
    page.getByRole("dialog", { name: "Таны хариулт" }),
  ).toBeVisible();
  await page.getByRole("button", { name: /ДАРААГИЙН АСУУЛТ/ }).click();
  await expect(
    page.getByRole("dialog", { name: "Гурван хариултаас сонгох" }),
  ).toContainText("Тестийн карт 2");
  await page
    .getByRole("button", { name: "Нууц карт 1 сонгох", exact: true })
    .click();
  await expect(
    page.getByRole("dialog", { name: "Картын төлбөр" }),
  ).toBeVisible();
});

test("empty, invalid and failed catalogue states are readable and retryable", async ({
  page,
}) => {
  let mode = "empty";
  await page.route("http://localhost:4000/**", (route) =>
    route.request().url().endsWith("/api/journey/session")
      ? route.fulfill({
          headers: {
            "Access-Control-Allow-Origin": "http://127.0.0.1:3100",
            "Access-Control-Allow-Credentials": "true",
          },
          json: {
            success: true,
            data: {
              settings: {
                siteName: "TENGER ATLS",
                cardPriceMnt: 3000,
                firstCardFree: true,
              },
              selections: [],
              mode: "mock",
            },
          },
        })
      : route.fulfill({
          headers: {
            "Access-Control-Allow-Origin": "http://127.0.0.1:3100",
            "Access-Control-Allow-Credentials": "true",
            "Access-Control-Allow-Headers": "Content-Type",
          },
          status: mode === "error" ? 500 : 200,
          json:
            mode === "error"
              ? { success: false, message: "Контент уншихад алдаа гарлаа." }
              : {
                  success: true,
                  data:
                    mode === "empty"
                      ? []
                      : mode === "invalid"
                        ? [{ id: "broken" }]
                        : catalogue(),
                },
        }),
  );
  await page.goto("/");
  await expect(page.getByText(/Одоогоор нийтэлсэн карт алга/)).toBeVisible();
  mode = "invalid";
  await page.reload();
  await expect(page.getByRole("main").getByRole("alert")).toContainText(
    "гурван хариулт",
  );
  mode = "error";
  await page.getByRole("button", { name: "Дахин ачаалах" }).click();
  await expect(page.getByRole("main").getByRole("alert")).toContainText(
    "Контент уншихад алдаа",
  );
  mode = "ok";
  await page.getByRole("button", { name: "Дахин ачаалах" }).click();
  await expect(
    page.getByRole("group", { name: "Зөгнөлт картууд" }).getByRole("button"),
  ).toHaveCount(12);
});

test("refresh reads changed admin content; double click sends only one reveal", async ({
  page,
}) => {
  const api = await mockApi(page, { delayed: true });
  await page.goto("/");
  await expect(
    page.getByRole("group", { name: "Зөгнөлт картууд" }),
  ).toBeVisible();
  api.data[0].title = "Админаас өөрчилсөн нэр";
  await page.reload();
  await openPicker(page, "Админаас өөрчилсөн нэр — карт сонгох");
  await page
    .getByRole("button", { name: "Нууц карт 1 сонгох", exact: true })
    .dblclick({ force: true });
  await expect(
    page.getByRole("dialog", { name: "Таны хариулт" }),
  ).toBeVisible();
  expect(api.revealed).toHaveLength(1);
});
