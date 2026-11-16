"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

type ContentType = "TOPIC" | "QUESTION";
type ContentStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";
type VisualType = "IMAGE" | "ICON";

type VisualFields = {
  visualType: VisualType;
  imageUrl: string;
  iconName: string;
};

type AnswerForm = VisualFields & {
  text: string;
};

type ContentForm = VisualFields & {
  type: ContentType;
  title: string;
  question: string;
  status: ContentStatus;
  sortOrder: number;
  answers: AnswerForm[];
};

type ContentRecord = {
  id: string;
  type: ContentType;
  title: string;
  question: string | null;
  visualType: VisualType;
  imageUrl: string | null;
  iconName: string | null;
  status: ContentStatus;
  sortOrder: number;
  answers: Array<{
    id: string;
    text: string;
    visualType: VisualType;
    imageUrl: string | null;
    iconName: string | null;
    position: number;
  }>;
};

type ApiResult<T> = {
  success: boolean;
  data?: T;
  message?: string;
  errors?: Array<{
    field: string;
    message: string;
  }>;
};

function emptyAnswer(): AnswerForm {
  return {
    text: "",
    visualType: "ICON",
    imageUrl: "",
    iconName: "✧",
  };
}

function emptyForm(): ContentForm {
  return {
    type: "TOPIC",
    title: "",
    question: "",
    visualType: "ICON",
    imageUrl: "",
    iconName: "✧",
    status: "DRAFT",
    sortOrder: 0,
    answers: [emptyAnswer(), emptyAnswer(), emptyAnswer()],
  };
}

function VisualPreview({ visualType, imageUrl, iconName }: VisualFields) {
  return (
    <div className="relative flex aspect-[2/3] w-24 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-[#a98b5b]/60 bg-[radial-gradient(ellipse_at_center,#35271e,#100d12)] sm:w-28">
      <div className="pointer-events-none absolute inset-1.5 rounded border border-[#b99a65]/40" />

      {visualType === "IMAGE" && imageUrl ? (
        // Админы оруулсан зургийн URL-ийн preview
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={imageUrl}
          alt="Картын зураг"
          className="h-full w-full object-cover"
        />
      ) : (
        <span className="max-w-full break-all px-2 text-center text-3xl text-[#dec18c]">
          {visualType === "ICON" ? iconName || "✧" : "✧"}
        </span>
      )}
    </div>
  );
}

function VisualEditor({
  value,
  onChange,
}: {
  value: VisualFields;
  onChange: (patch: Partial<VisualFields>) => void;
}) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row">
      <VisualPreview {...value} />

      <div className="flex-1 space-y-3">
        <div>
          <label className="mb-2 block text-xs text-[#c5ad86]">
            Дүрсний төрөл
          </label>

          <select
            value={value.visualType}
            onChange={(event) =>
              onChange({
                visualType: event.target.value as VisualType,
              })
            }
            className="w-full rounded-lg border border-[#957c55]/40 bg-[#0d0a12] px-3 py-3 text-sm text-[#f4ead8] outline-none focus:border-[#d0ad74]"
          >
            <option value="IMAGE">Зураг</option>
            <option value="ICON">Icon / тэмдэг</option>
          </select>
        </div>

        {value.visualType === "IMAGE" ? (
          <div>
            <label className="mb-2 block text-xs text-[#c5ad86]">
              Зургийн URL
            </label>

            <input
              type="text"
              value={value.imageUrl}
              onChange={(event) =>
                onChange({
                  imageUrl: event.target.value,
                })
              }
              placeholder="/cards/card-01.jpg эсвэл https://..."
              className="w-full rounded-lg border border-[#957c55]/40 bg-[#0d0a12] px-3 py-3 text-sm text-white outline-none focus:border-[#d0ad74]"
            />

            <p className="mt-2 text-[11px] leading-5 text-[#93859b]">
              Одоогоор зургийн URL оруулна. Шууд upload хийхийг дараагийн алхамд
              холбоно.
            </p>
          </div>
        ) : (
          <div>
            <label className="mb-2 block text-xs text-[#c5ad86]">
              Icon / тэмдэг
            </label>

            <input
              type="text"
              value={value.iconName}
              onChange={(event) =>
                onChange({
                  iconName: event.target.value,
                })
              }
              placeholder="✧, ☾, ♡, ✦"
              className="w-full rounded-lg border border-[#957c55]/40 bg-[#0d0a12] px-3 py-3 text-sm text-white outline-none focus:border-[#d0ad74]"
            />
          </div>
        )}
      </div>
    </div>
  );
}

export default function AdminContentsPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const [contents, setContents] = useState<ContentRecord[]>([]);
  const [form, setForm] = useState<ContentForm>(emptyForm);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [showEditor, setShowEditor] = useState(false);

  const [filter, setFilter] = useState<"ALL" | ContentType>("ALL");

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    let active = true;

    async function initialize() {
      try {
        const authResponse = await fetch(`${API_URL}/api/admin/me`, {
          credentials: "include",
          cache: "no-store",
        });

        if (!authResponse.ok) {
          router.replace("/admin/login");
          return;
        }

        const response = await fetch(`${API_URL}/api/admin/contents`, {
          credentials: "include",
          cache: "no-store",
        });

        if (response.status === 401) {
          router.replace("/admin/login");
          return;
        }

        const result: ApiResult<ContentRecord[]> = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(result.message || "Контент уншихад алдаа гарлаа.");
        }

        if (active) {
          setContents(result.data ?? []);
        }
      } catch (err) {
        if (active) {
          setError(
            err instanceof Error
              ? err.message
              : "Backend сервертэй холбогдож чадсангүй.",
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    initialize();

    return () => {
      active = false;
    };
  }, [router]);

  async function refreshContents() {
    const response = await fetch(`${API_URL}/api/admin/contents`, {
      credentials: "include",
      cache: "no-store",
    });

    if (response.status === 401) {
      router.replace("/admin/login");
      throw new Error("Нэвтрэх хугацаа дууссан.");
    }

    const result: ApiResult<ContentRecord[]> = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(result.message || "Контент уншиж чадсангүй.");
    }

    setContents(result.data ?? []);
  }

  function startCreate(type: ContentType) {
    setForm({
      ...emptyForm(),
      type,
    });

    setEditingId(null);
    setShowEditor(true);
    setError("");
    setMessage("");

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  function startEdit(content: ContentRecord) {
    setEditingId(content.id);

    setForm({
      type: content.type,
      title: content.title,
      question: content.question ?? "",
      visualType: content.visualType,
      imageUrl: content.imageUrl ?? "",
      iconName: content.iconName ?? "",
      status: content.status,
      sortOrder: content.sortOrder,
      answers: [1, 2, 3].map((position) => {
        const answer = content.answers.find(
          (item) => item.position === position,
        );

        return answer
          ? {
              text: answer.text,
              visualType: answer.visualType,
              imageUrl: answer.imageUrl ?? "",
              iconName: answer.iconName ?? "",
            }
          : emptyAnswer();
      }),
    });

    setShowEditor(true);
    setError("");
    setMessage("");

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  function changeForm(patch: Partial<ContentForm>) {
    setForm((current) => ({
      ...current,
      ...patch,
    }));
  }

  function changeAnswer(index: number, patch: Partial<AnswerForm>) {
    setForm((current) => ({
      ...current,
      answers: current.answers.map((answer, i) =>
        i === index ? { ...answer, ...patch } : answer,
      ),
    }));
  }

  async function saveContent(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (busy) return;

    setBusy(true);
    setError("");
    setMessage("");

    try {
      const url = editingId
        ? `${API_URL}/api/admin/contents/${editingId}`
        : `${API_URL}/api/admin/contents`;

      const response = await fetch(url, {
        method: editingId ? "PUT" : "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type: form.type,
          title: form.title.trim(),
          question: form.question.trim() || null,
          visualType: form.visualType,
          imageUrl: form.imageUrl.trim() || null,
          iconName: form.iconName.trim() || null,
          status: form.status,
          sortOrder: Number(form.sortOrder),
          answers: form.answers.map((answer) => ({
            text: answer.text.trim(),
            visualType: answer.visualType,
            imageUrl: answer.imageUrl.trim() || null,
            iconName: answer.iconName.trim() || null,
          })),
        }),
      });

      if (response.status === 401) {
        router.replace("/admin/login");
        return;
      }

      const result: ApiResult<ContentRecord> = await response.json();

      if (!response.ok || !result.success) {
        const details = result.errors
          ?.map((item) => `${item.field}: ${item.message}`)
          .join(" · ");

        throw new Error(
          details || result.message || "Хадгалахад алдаа гарлаа.",
        );
      }

      await refreshContents();

      setShowEditor(false);
      setEditingId(null);
      setForm(emptyForm());

      setMessage(
        editingId
          ? "Контент амжилттай шинэчлэгдлээ."
          : "Шинэ контент амжилттай нэмэгдлээ.",
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Хадгалахад алдаа гарлаа.");
    } finally {
      setBusy(false);
    }
  }

  async function deleteContent(content: ContentRecord) {
    if (busy) return;

    const confirmed = window.confirm(
      `"${content.title}" контентыг болон түүний 3 хариултыг устгах уу?`,
    );

    if (!confirmed) return;

    setBusy(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch(
        `${API_URL}/api/admin/contents/${content.id}`,
        {
          method: "DELETE",
          credentials: "include",
        },
      );

      if (response.status === 401) {
        router.replace("/admin/login");
        return;
      }

      const result: ApiResult<unknown> = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Устгахад алдаа гарлаа.");
      }

      await refreshContents();

      if (editingId === content.id) {
        setShowEditor(false);
        setEditingId(null);
        setForm(emptyForm());
      }

      setMessage("Контент устгагдлаа.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Устгахад алдаа гарлаа.");
    } finally {
      setBusy(false);
    }
  }

  const filteredContents = contents.filter(
    (item) => filter === "ALL" || item.type === filter,
  );

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#0a0812] text-[#d6b77d]">
        <p className="text-xs tracking-[0.3em]">КОНТЕНТ УНШИЖ БАЙНА...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#0a0812] text-[#f4ead8]">
      {/* HEADER */}
      <header className="border-b border-[#b99a65]/20">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-5 py-5">
          <div>
            <h1 className="text-lg font-semibold tracking-[0.2em] text-[#d6b77d]">
              TENGER ATLS
            </h1>

            <p className="mt-1 text-[10px] tracking-[0.22em] text-[#9582a1]">
              CONTENT MANAGEMENT
            </p>
          </div>

          <a
            href="/admin"
            className="rounded-full border border-[#b99a65]/40 px-5 py-2.5 text-xs text-[#d6b77d] hover:bg-[#b99a65]/10"
          >
            ← DASHBOARD
          </a>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-5">
          <div>
            <p className="text-xs tracking-[0.25em] text-[#a98c63]">
              ADMIN PANEL
            </p>

            <h2 className="mt-3 text-2xl font-light text-[#ead8b6] sm:text-3xl">
              Сэдэв ба асуултууд
            </h2>

            <p className="mt-3 text-sm text-[#a99dad]">
              Нийт {contents.length} контент бүртгэлтэй
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => startCreate("TOPIC")}
              className="rounded-lg border border-[#b99a65]/60 px-4 py-3 text-xs text-[#e1c58e] hover:bg-[#b99a65]/10"
            >
              + Шинэ сэдэв
            </button>

            <button
              type="button"
              onClick={() => startCreate("QUESTION")}
              className="rounded-lg bg-[#c5a46e] px-4 py-3 text-xs font-medium text-[#100c12] hover:bg-[#dfbc83]"
            >
              + Шинэ асуулт
            </button>
          </div>
        </div>

        {/* МЭДЭГДЭЛ */}
        {message && (
          <div
            role="status"
            className="mb-6 rounded-lg border border-[#8caa82]/40 bg-[#8caa82]/10 px-4 py-3 text-sm text-[#c9dfbd]"
          >
            {message}
          </div>
        )}

        {error && (
          <div
            role="alert"
            className="mb-6 rounded-lg border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm leading-6 text-red-300"
          >
            {error}
          </div>
        )}

        {/* НЭМЭХ / ЗАСАХ ФОРМ */}
        {showEditor && (
          <section className="mb-10 rounded-2xl border border-[#b99a65]/35 bg-[#15101b] p-5 sm:p-8">
            <div className="mb-7 flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] tracking-[0.25em] text-[#a98c63]">
                  CONTENT EDITOR
                </p>

                <h3 className="mt-2 text-xl text-[#ead8b6]">
                  {editingId ? "Контент засах" : "Шинэ контент нэмэх"}
                </h3>
              </div>

              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  setShowEditor(false);
                  setEditingId(null);
                  setError("");
                }}
                className="rounded-full border border-[#a98c63]/30 px-4 py-2 text-xs text-[#c5ad86] hover:bg-white/5"
              >
                Хаах
              </button>
            </div>

            <form onSubmit={saveContent} className="space-y-8">
              {/* ҮНДСЭН МЭДЭЭЛЭЛ */}
              <div className="grid gap-5 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-xs text-[#c5ad86]">
                    Контентийн төрөл
                  </label>

                  <select
                    value={form.type}
                    onChange={(event) =>
                      changeForm({
                        type: event.target.value as ContentType,
                      })
                    }
                    className="w-full rounded-lg border border-[#957c55]/40 bg-[#0d0a12] px-4 py-3 text-sm outline-none focus:border-[#d0ad74]"
                  >
                    <option value="TOPIC">Сэдэв</option>
                    <option value="QUESTION">Асуулт</option>
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-xs text-[#c5ad86]">
                    Нэр / Гарчиг
                  </label>

                  <input
                    required
                    maxLength={150}
                    value={form.title}
                    onChange={(event) =>
                      changeForm({
                        title: event.target.value,
                      })
                    }
                    placeholder={
                      form.type === "TOPIC"
                        ? "Жишээ: Хайр дурлал"
                        : "Жишээ: Тэр намайг боддог болов уу?"
                    }
                    className="w-full rounded-lg border border-[#957c55]/40 bg-[#0d0a12] px-4 py-3 text-sm outline-none focus:border-[#d0ad74]"
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-xs text-[#c5ad86]">
                  {form.type === "QUESTION"
                    ? "Асуултын текст"
                    : "Сэдвийн тайлбар / асуулт (заавал биш)"}
                </label>

                <textarea
                  required={form.type === "QUESTION"}
                  maxLength={500}
                  rows={3}
                  value={form.question}
                  onChange={(event) =>
                    changeForm({
                      question: event.target.value,
                    })
                  }
                  placeholder="Хэрэглэгчид харагдах асуулт эсвэл тайлбар"
                  className="w-full resize-y rounded-lg border border-[#957c55]/40 bg-[#0d0a12] px-4 py-3 text-sm leading-6 outline-none focus:border-[#d0ad74]"
                />
              </div>

              {/* ҮНДСЭН КАРТЫН ЗУРАГ */}
              <div className="rounded-xl border border-[#b99a65]/20 bg-[#0d0b13] p-5">
                <h4 className="mb-5 text-base text-[#e2c58d]">
                  Үндсэн картын зураг / Icon
                </h4>

                <VisualEditor
                  value={form}
                  onChange={(patch) => changeForm(patch)}
                />
              </div>

              {/* 3 ХАРИУЛТ */}
              <div>
                <div className="mb-5">
                  <h4 className="text-lg text-[#e2c58d]">
                    3 нууц хариултын карт
                  </h4>

                  <p className="mt-2 text-xs leading-6 text-[#a99dad]">
                    Хариулт бүр өөрийн зураг эсвэл icon, тайлбарын тексттэй
                    байна. Хариултын текст сонголт хийхээс өмнө хэрэглэгчид
                    харагдахгүй.
                  </p>
                </div>

                <div className="grid gap-5 lg:grid-cols-3">
                  {form.answers.map((answer, index) => (
                    <div
                      key={index}
                      className="rounded-xl border border-[#b99a65]/25 bg-[#0d0b13] p-4 sm:p-5"
                    >
                      <div className="mb-5 flex items-center justify-between">
                        <h5 className="text-sm font-medium text-[#e0bf89]">
                          Хариулт {index + 1}
                        </h5>

                        <span className="text-xs text-[#8c7895]">
                          Нууц карт
                        </span>
                      </div>

                      <VisualEditor
                        value={answer}
                        onChange={(patch) => changeAnswer(index, patch)}
                      />

                      <div className="mt-5">
                        <label className="mb-2 block text-xs text-[#c5ad86]">
                          Хариултын тайлбар
                        </label>

                        <textarea
                          required
                          maxLength={5000}
                          rows={6}
                          value={answer.text}
                          onChange={(event) =>
                            changeAnswer(index, {
                              text: event.target.value,
                            })
                          }
                          placeholder={`Хариулт ${index + 1}-ийн текст`}
                          className="w-full resize-y rounded-lg border border-[#957c55]/40 bg-[#15101b] px-3 py-3 text-sm leading-6 outline-none focus:border-[#d0ad74]"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* ТӨЛӨВ */}
              <div className="grid gap-5 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-xs text-[#c5ad86]">
                    Нийтлэлийн төлөв
                  </label>

                  <select
                    value={form.status}
                    onChange={(event) =>
                      changeForm({
                        status: event.target.value as ContentStatus,
                      })
                    }
                    className="w-full rounded-lg border border-[#957c55]/40 bg-[#0d0a12] px-4 py-3 text-sm outline-none focus:border-[#d0ad74]"
                  >
                    <option value="DRAFT">Ноорог</option>
                    <option value="PUBLISHED">Нийтэлсэн</option>
                    <option value="ARCHIVED">Архивласан</option>
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-xs text-[#c5ad86]">
                    Эрэмбэ
                  </label>

                  <input
                    type="number"
                    min={0}
                    value={form.sortOrder}
                    onChange={(event) =>
                      changeForm({
                        sortOrder: Number(event.target.value),
                      })
                    }
                    className="w-full rounded-lg border border-[#957c55]/40 bg-[#0d0a12] px-4 py-3 text-sm outline-none focus:border-[#d0ad74]"
                  />
                </div>
              </div>

              <div className="flex flex-wrap gap-3 border-t border-[#b99a65]/20 pt-6">
                <button
                  type="submit"
                  disabled={busy}
                  className="rounded-lg bg-[#c5a46e] px-7 py-3 text-sm font-medium text-[#100c12] hover:bg-[#dfbc83] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {busy
                    ? "ХАДГАЛЖ БАЙНА..."
                    : editingId
                      ? "ӨӨРЧЛӨЛТ ХАДГАЛАХ"
                      : "КОНТЕНТ НЭМЭХ"}
                </button>

                <button
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    setShowEditor(false);
                    setEditingId(null);
                    setError("");
                  }}
                  className="rounded-lg border border-[#b99a65]/40 px-7 py-3 text-sm text-[#c5ad86] hover:bg-white/5"
                >
                  Болих
                </button>
              </div>
            </form>
          </section>
        )}

        {/* ЖАГСААЛТЫН ШҮҮЛТ */}
        <section className="rounded-2xl border border-[#b99a65]/20 bg-[#15101b]">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#b99a65]/20 p-5">
            <h3 className="text-lg text-[#ead8b6]">Бүх контент</h3>

            <div className="flex flex-wrap gap-2">
              {(
                [
                  ["ALL", "Бүгд"],
                  ["TOPIC", "Сэдэв"],
                  ["QUESTION", "Асуулт"],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setFilter(value)}
                  className={`rounded-full px-4 py-2 text-xs transition ${
                    filter === value
                      ? "bg-[#c5a46e] text-[#100c12]"
                      : "border border-[#b99a65]/30 text-[#bca582] hover:bg-white/5"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {filteredContents.length === 0 ? (
            <div className="px-5 py-16 text-center">
              <div className="mb-5 text-4xl text-[#c5a46e]">✧</div>

              <p className="text-sm text-[#c9b8d0]">
                Одоогоор контент алга байна.
              </p>

              <p className="mt-2 text-xs text-[#8f809a]">
                Дээрх товчоор шинэ сэдэв эсвэл асуулт нэмээрэй.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-[#b99a65]/15">
              {filteredContents.map((content) => (
                <div
                  key={content.id}
                  className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center"
                >
                  <VisualPreview
                    visualType={content.visualType}
                    imageUrl={content.imageUrl ?? ""}
                    iconName={content.iconName ?? ""}
                  />

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full border border-[#9d825a]/35 px-3 py-1 text-[10px] text-[#c7a978]">
                        {content.type === "TOPIC" ? "СЭДЭВ" : "АСУУЛТ"}
                      </span>

                      <span
                        className={`rounded-full px-3 py-1 text-[10px] ${
                          content.status === "PUBLISHED"
                            ? "bg-[#426c4b]/25 text-[#a6d1a6]"
                            : content.status === "DRAFT"
                              ? "bg-[#806a3b]/25 text-[#d5b77c]"
                              : "bg-white/5 text-[#a99dad]"
                        }`}
                      >
                        {content.status === "PUBLISHED"
                          ? "Нийтэлсэн"
                          : content.status === "DRAFT"
                            ? "Ноорог"
                            : "Архив"}
                      </span>
                    </div>

                    <h4 className="mt-3 text-lg text-[#ead8b6]">
                      {content.title}
                    </h4>

                    {content.question && (
                      <p className="mt-2 text-sm leading-6 text-[#a99dad]">
                        {content.question}
                      </p>
                    )}

                    <p className="mt-2 text-xs text-[#8f809a]">
                      {content.answers.length} хариулт
                      {" · "}
                      Эрэмбэ: {content.sortOrder}
                    </p>
                  </div>

                  <div className="flex shrink-0 gap-2">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => startEdit(content)}
                      className="rounded-lg border border-[#b99a65]/45 px-4 py-2.5 text-xs text-[#dfc48e] hover:bg-[#b99a65]/10 disabled:opacity-50"
                    >
                      Засах
                    </button>

                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => deleteContent(content)}
                      className="rounded-lg border border-red-400/25 px-4 py-2.5 text-xs text-red-300 hover:bg-red-500/10 disabled:opacity-50"
                    >
                      Устгах
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
