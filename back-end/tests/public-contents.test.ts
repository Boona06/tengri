import assert from "node:assert/strict";
import { test } from "node:test";
import { once } from "node:events";
import express from "express";
import { createPublicContentsRouter } from "../src/routes/public-contents.ts";

test("published catalogue and selected answers follow admin changes", async (t) => {
  let title = "Анхны сэдэв";
  let text = "Анхны хариулт";
  let published = true;
  let unavailable = false;
  const db = {
    content: {
      async findMany(query: any) {
        assert.equal(query.where.status, "PUBLISHED");
        assert.deepEqual(query.orderBy, [{ sortOrder: "asc" }, { createdAt: "desc" }]);
        assert.equal(query.select.answers.select.text, undefined);
        assert.deepEqual(query.select.answers.orderBy, { position: "asc" });
        if (unavailable) throw new Error("database unavailable");
        return published ? [{ id: "topic", title, question: "Асуулт?", imageUrl: "/cards/card-01.jpg",
          answers: [1, 2, 3].map(position => ({ id: `answer-${position}`, position, visualType: "ICON", iconName: "✧" })) }] : [];
      },
    },
    answer: {
      async findFirst(query: any) {
        assert.equal(query.where.content.status, "PUBLISHED");
        if (unavailable) throw new Error("database unavailable");
        return published && query.where.contentId === "topic" && /^answer-[123]$/.test(query.where.id)
          ? { id: query.where.id, text, visualType: "ICON", iconName: "✧" } : null;
      },
    },
  } as unknown as Parameters<typeof createPublicContentsRouter>[0];
  const app = express();
  app.use("/api/contents", createPublicContentsRouter(db));
  const server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  t.after(() => { server.closeAllConnections(); server.close(); });
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  const base = `http://127.0.0.1:${address.port}/api/contents`;

  await t.test("catalogue contains three visuals, but no answer text", async () => {
    const response = await fetch(base);
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("cache-control"), "no-store");
    const body = await response.json();
    assert.equal(body.data[0].answers.length, 3);
    assert.equal(body.data[0].answers[0].text, undefined);
  });
  await t.test("updated title and all three selected answers are read fresh", async () => {
    title = "Зассан сэдэв";
    text = "Зассан хариулт";
    assert.equal((await (await fetch(base)).json()).data[0].title, title);
    for (const position of [1, 2, 3]) {
      const response = await fetch(`${base}/topic/answers/answer-${position}/reveal`, { method: "POST" });
      assert.equal(response.status, 200);
      assert.equal((await response.json()).data.text, text);
    }
  });
  await t.test("an answer cannot be revealed under another content id", async () => {
    const response = await fetch(`${base}/other/answers/answer-1/reveal`, { method: "POST" });
    assert.equal(response.status, 404);
  });
  await t.test("unpublished content and its answers disappear", async () => {
    published = false;
    assert.equal((await (await fetch(base)).json()).count, 0);
    assert.equal((await fetch(`${base}/topic/answers/answer-1/reveal`, { method: "POST" })).status, 404);
  });
  await t.test("database failures return controlled errors", async () => {
    unavailable = true;
    assert.equal((await fetch(base)).status, 500);
    assert.equal((await fetch(`${base}/topic/answers/answer-1/reveal`, { method: "POST" })).status, 500);
  });
});
