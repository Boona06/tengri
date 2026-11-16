// Run from back-end with both servers running: node tests/live-content-check.mjs setup|update|cleanup
// Uses the real admin API. Only creates/updates/deletes its own marked test content.
import "dotenv/config";
import assert from "node:assert/strict";
import { readFile, writeFile, unlink } from "node:fs/promises";

const base = "http://localhost:4000/api";
const statePath = new URL(".live-content-test.json", import.meta.url);
const marker = "TengerATLS QA 20261116";
const action = process.argv[2];
assert.ok(["setup", "update", "cleanup"].includes(action), "Choose setup, update or cleanup");
const login = await fetch(`${base}/admin/login`, {
  method: "POST", headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ email: process.env.ADMIN_EMAIL, password: process.env.ADMIN_PASSWORD }),
});
assert.equal(login.status, 200, "Existing admin must log in");
const cookie = login.headers.get("set-cookie").split(";")[0];
async function api(path, method = "GET", data) {
  const response = await fetch(base + path, {
    method, headers: { cookie, "Content-Type": "application/json" },
    body: data ? JSON.stringify(data) : undefined,
    signal: AbortSignal.timeout(15000),
  });
  assert.ok(response.ok, `${method} ${path}: ${response.status}`);
  return response.json();
}
if (action === "setup") {
  const existing = (await api("/admin/contents")).data;
  assert.ok(!existing.some(item => item.title.startsWith(marker)), "Clean up previous QA content first");
  const input = {
    type: "TOPIC", title: `${marker} — Анхны сэдэв`, question: "Анхны асуулт?",
    visualType: "ICON", iconName: "☀", imageUrl: null, sortOrder: 0, status: "DRAFT",
    answers: [1, 2, 3].map(n => ({ text: `Анхны хариулт ${n}`, visualType: "ICON", iconName: ["☾", "✦", "☼"][n - 1], imageUrl: null })),
  };
  const record = (await api("/admin/contents", "POST", input)).data;
  await writeFile(statePath, JSON.stringify({ id: record.id, marker }));
  assert.ok(!(await api("/contents")).data.some(item => item.id === record.id), "Draft must stay private");
  await api(`/admin/contents/${record.id}`, "PUT", { ...input, status: "PUBLISHED" });
  const published = (await api("/contents")).data.find(item => item.id === record.id);
  assert.equal(published.title, input.title);
  assert.equal(published.answers.length, 3);
  console.log("PASS: authenticated create, draft hidden, publish, three cards. Ready for browser check.");
} else {
  const state = JSON.parse(await readFile(statePath, "utf8"));
  assert.equal(state.marker, marker);
  const record = (await api(`/admin/contents/${state.id}`)).data;
  assert.ok(record.title.startsWith(marker), "Refuse to modify unrelated content");
  if (action === "update") {
    const input = {
      type: "QUESTION", title: `${marker} — Шинэчилсэн сэдэв`, question: "Админаас зассан асуулт зөв харагдаж байна уу?",
      visualType: "IMAGE", imageUrl: "/cards/card-03.jpg", iconName: null,
      status: "PUBLISHED", sortOrder: 0,
      answers: [1, 2, 3].map(n => ({ text: `ШИНЭ ХАРИУЛТ ${n}: Админы хадгалсан мэдээлэл амжилттай холбогдлоо.`,
        visualType: n === 2 ? "ICON" : "IMAGE", iconName: n === 2 ? "♡" : null,
        imageUrl: n === 2 ? null : `/cards/card-0${n === 1 ? 1 : 4}.jpg` })),
    };
    await api(`/admin/contents/${state.id}`, "PUT", input);
    const published = (await api("/contents")).data.find(item => item.id === state.id);
    assert.equal(published.title, input.title);
    assert.equal(published.question, input.question);
    assert.equal(published.type, "QUESTION");
    assert.equal(published.imageUrl, input.imageUrl);
    for (const [index, answer] of published.answers.entries()) {
      assert.equal(answer.text, undefined);
      assert.equal(answer.imageUrl, input.answers[index].imageUrl);
      const revealed = (await api(`/contents/${state.id}/answers/${answer.id}/reveal`, "POST")).data;
      assert.equal(revealed.text, input.answers[index].text);
      assert.equal(revealed.iconName, input.answers[index].iconName);
    }
    console.log("PASS: title, question, type, cover, three answer visuals and all three texts updated in real database/API.");
  } else {
    await api(`/admin/contents/${state.id}`, "DELETE");
    assert.ok(!(await api("/contents")).data.some(item => item.id === state.id));
    await unlink(statePath);
    console.log("PASS: removed only this script's test content; public catalogue restored.");
  }
}
