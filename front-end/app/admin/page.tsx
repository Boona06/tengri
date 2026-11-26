"use client";
import Link from "next/link";
import TrendChart from "../../components/TrendChart";
import {
  Suspense,
  useCallback,
  useEffect,
  useState,
  type FormEvent,
} from "react";
import { useRouter } from "next/navigation";
const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
type Admin = { id: string; email: string; role: string; active: boolean };
type Settings = {
  siteName: string;
  cardPriceMnt: number;
  firstCardFree: boolean;
};
type Coupon = {
  id: string;
  code: string;
  kind: string;
  value: number;
  active: boolean;
  used: number;
  maxUses: number;
  expiresAt: string;
};
type Payment = {
  id: string;
  amount: number;
  mode: string;
  status: string;
  createdAt: string;
  paidAt: string | null;
  couponCode: string | null;
  selection: { title: string };
};
type Report = {
  visitors: number;
  visits: number;
  contents: number;
  unlocked: number;
  revenue: number;
  paid: number;
  payments: Payment[];
  daily: { day: string; visits: number; revenue: number }[];
  top: { title: string; count: number }[];
};
const money = (v: number) => new Intl.NumberFormat("mn-MN").format(v) + "₮";
const names: Record<string, string> = {
  ADMIN: "Админ",
  MODERATOR: "Модератор",
  EDITOR: "Редактор",
  PAID: "Төлөгдсөн",
  PENDING: "Хүлээгдэж буй",
  CREATING: "Үүсгэж байна",
  FAILED: "Амжилтгүй",
  EXPIRED: "Хугацаа дууссан",
  live: "Бодит",
  sandbox: "QPay sandbox",
  mock: "Тест",
  coupon: "Купон",
};
async function api(path: string, method = "GET", body?: unknown) {
  const r = await fetch(API + path, {
    method,
    credentials: "include",
    cache: "no-store",
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const d = await r.json();
  if (!r.ok) throw Error(d.message || "Үйлдэл амжилтгүй.");
  return d;
}
function Dashboard() {
  const router = useRouter();
  const [me, setMe] = useState<Admin | null>(null);
  const [tab, setTab] = useState("overview");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [settings, setSettings] = useState<Settings>({
    siteName: "TENGER ATLS",
    cardPriceMnt: 3000,
    firstCardFree: true,
  });
  const [report, setReport] = useState<Report | null>(null);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [team, setTeam] = useState<Admin[]>([]);
  const [audit, setAudit] = useState<
    { id: string; action: string; target: string; createdAt: string }[]
  >([]);
  const [range, setRange] = useState("month");
  const [date, setDate] = useState(
    new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Ulaanbaatar" }),
  );
  const [filter, setFilter] = useState("ALL");
  const load = useCallback(async () => {
    const m = (await api("/api/admin/me")).admin as Admin;
    setMe(m);
    setSettings((await api("/api/admin/operations/settings")).data);
    if (m.role === "ADMIN") {
      const [a, b, c, d] = await Promise.all([
        api("/api/admin/operations/report?range=" + range + "&date=" + date),
        api("/api/admin/operations/coupons"),
        api("/api/admin/operations/team"),
        api("/api/admin/operations/audit"),
      ]);
      setReport(a.data);
      setCoupons(b.data);
      setTeam(c.data);
      setAudit(d.data);
    }
  }, [range, date]);
  useEffect(() => {
    void Promise.resolve()
      .then(load)
      .catch((e) => {
        setError(e.message);
        if (e.message.includes("Нэвтрэх") || e.message.includes("хугацаа"))
          router.replace("/admin/login");
      });
  }, [load, router]);
  async function act(fn: () => Promise<unknown>, message = "Хадгаллаа.") {
    if (busy) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await fn();
      await load();
      setNotice(message);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Алдаа гарлаа.");
    } finally {
      setBusy(false);
    }
  }
  function form(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    return new FormData(e.currentTarget);
  }
  const admin = me?.role === "ADMIN";
  const tabs = [
    ["overview", "Тойм", "◉"],
    ["content", "Контент", "✦"],
    ...(admin
      ? [
          ["settings", "Үнэ ба купон", "◇"],
          ["analytics", "Хандалт", "↗"],
          ["payments", "Төлбөр ба орлого", "₮"],
          ["team", "Баг ба эрх", "◎"],
        ]
      : []),
    ["account", "Миний тохиргоо", "⚙"],
  ];
  if (!me)
    return (
      <main className="studio-panel" role="status">
        {error || "Удирдлагын самбарыг уншиж байна…"}
      </main>
    );
  return (
    <main className="studio">
      <aside className="studio-sidebar">
        <Link href="/" className="studio-brand">
          tenger<span>atls.</span>
        </Link>
        <p className="studio-caption">УДИРДЛАГЫН САМБАР</p>
        <nav>
          {tabs.map(([id, label, icon]) => (
            <button
              key={id}
              className={tab === id ? "active" : ""}
              onClick={() => {
                setTab(id);
                setNotice("");
                setError("");
              }}
            >
              <span>{icon}</span>
              {label}
            </button>
          ))}
        </nav>
        <div className="studio-profile">
          <strong>{me ? names[me.role] : "Уншиж байна…"}</strong>
          <small>{me?.email}</small>
          <button
            onClick={() =>
              void act(async () => {
                await api("/api/admin/logout", "POST");
                router.replace("/admin/login");
              }, "Гарлаа.")
            }
          >
            Гарах ↗
          </button>
        </div>
      </aside>
      <div className="studio-main">
        <header className="studio-top">
          <div>
            <p className="studio-caption">ӨНӨӨДӨР ЮУ ШИНЭ БАЙНА?</p>
            <h1>{tabs.find((t) => t[0] === tab)?.[1]}</h1>
          </div>
          <Link href="/" className="studio-btn secondary">
            Сайт харах ↗
          </Link>
          <button type="button" className="studio-btn secondary" disabled={busy} onClick={()=>void act(async()=>{await api('/api/admin/logout','POST');router.replace('/admin/login');},'Гарлаа.')}>Гарах</button>
        </header>
        {error && (
          <p role="alert" className="studio-alert">
            {error}
          </p>
        )}
        {notice && (
          <p role="status" className="studio-success">
            {notice}
          </p>
        )}
        {["overview", "analytics", "payments"].includes(tab) && admin && (
          <div className="studio-toolbar">
            <select
              aria-label="Тайлангийн хугацаа"
              value={range}
              onChange={(e) => setRange(e.target.value)}
            >
              <option value="day">Өдөр</option>
              <option value="month">Сар</option>
              <option value="year">Жил</option>
            </select>
            <input
              aria-label="Тайлангийн огноо"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
            <button
              className="studio-btn secondary"
              onClick={() => void act(load, "Шинэчиллээ.")}
            >
              Шинэчлэх
            </button>
            <small>
              Улаанбаатарын цагаар · орлогоос тестийн төлбөр хасагдсан
            </small>
          </div>
        )}
        {tab === "overview" && (
          <>
            <section className="studio-welcome">
              <div>
                <span className="studio-pill">Жижиг санаа. Шинэ боломж.</span>
                <h2>
                  Карт бүрт
                  <br />
                  өөрийн өнгийг нэм.
                </h2>
                <p>Сэдэв, асуулт, зураг, гурван хариулт — бүгд нэг дор.</p>
                <Link className="studio-btn" href="/admin/contents">
                  Контент засах ↗
                </Link>
              </div>
              <span aria-hidden="true" className="studio-star">
                ✳
              </span>
            </section>
            {report && (
              <div className="studio-stats">
                {[
                  ["Зочид", report.visitors],
                  ["Нээгдсэн карт", report.unlocked],
                  ["Бодит орлого", money(report.revenue)],
                  ["Нийт контент", report.contents],
                ].map(([k, v]) => (
                  <article key={k}>
                    <small>{k}</small>
                    <strong>{v}</strong>
                  </article>
                ))}
              </div>
            )}
            <section className="studio-panel">
              <h2>Хэрхэн ажилладаг вэ?</h2>
              <p>
                Нэг контент нь сэдэв эсвэл асуулт, үндсэн картын зураг, гурван
                сонголтын хариултаас бүрдэнэ. Тусдаа хоёр хэсэгт давхар засах
                шаардлагагүй.
              </p>
            </section>
          </>
        )}
        {tab === "content" && (
          <section className="studio-panel">
            <span className="studio-pill">НЭГ КАРТ · ГУРВАН ХАРИУЛТ</span>
            <h2>Контентоо нэг дор удирд.</h2>
            <p>
              Нэр, асуулт, зураг, icon, гурван хариулт болон нийтлэх төлөвөө нэг
              дэлгэцээс засна.
            </p>
            <Link className="studio-btn" href="/admin/contents">
              Контент удирдах ↗
            </Link>
          </section>
        )}
        {tab === "settings" && admin && (
          <>
            <form
              className="studio-panel"
              onSubmit={(e) => {
                form(e);
                void act(() =>
                  api("/api/admin/operations/settings", "PUT", settings),
                );
              }}
            >
              <h2>Үнэ ба сайтын тохиргоо</h2>
              <div className="studio-fields">
                <label>
                  Сайтын нэр
                  <input
                    required
                    maxLength={80}
                    value={settings.siteName}
                    onChange={(e) =>
                      setSettings({ ...settings, siteName: e.target.value })
                    }
                  />
                </label>
                <label>
                  Нэг картын үнэ · ₮
                  <input
                    required
                    type="number"
                    min={0}
                    max={1000000}
                    value={settings.cardPriceMnt}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        cardPriceMnt: Number(e.target.value),
                      })
                    }
                  />
                </label>
              </div>
              <label className="studio-check">
                <input
                  type="checkbox"
                  checked={settings.firstCardFree}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      firstCardFree: e.target.checked,
                    })
                  }
                />
                Эхний картыг үнэгүй нээх
              </label>
              <button disabled={busy} className="studio-btn">
                Хадгалах
              </button>
            </form>
            <form
              className="studio-panel"
              onSubmit={(e) => {
                const d = form(e);
                void act(
                  () =>
                    api("/api/admin/operations/coupons", "POST", {
                      code: d.get("code"),
                      kind: d.get("kind"),
                      value: Number(d.get("value")),
                      maxUses: Number(d.get("maxUses")),
                      expiresAt: new Date(
                        String(d.get("expiresAt")) + "T23:59:59+08:00",
                      ).toISOString(),
                      active: true,
                    }),
                  "Купон үүслээ.",
                );
              }}
            >
              <h2>Шинэ купон</h2>
              <div className="studio-fields">
                <label>
                  Код
                  <input
                    name="code"
                    placeholder="HELLO20"
                    required
                    pattern="[A-Za-z0-9_-]{3,30}"
                  />
                </label>
                <label>
                  Хөнгөлөлтийн төрөл
                  <select name="kind">
                    <option value="PERCENT">Хувь (%)</option>
                    <option value="FIXED">Дүн (₮)</option>
                  </select>
                </label>
                <label>
                  Хэмжээ
                  <input name="value" type="number" min={1} required />
                </label>
                <label>
                  Ашиглах дээд тоо
                  <input name="maxUses" type="number" min={1} required />
                </label>
                <label>
                  Дуусах өдөр
                  <input name="expiresAt" type="date" required />
                </label>
              </div>
              <button disabled={busy} className="studio-btn">
                Купон үүсгэх
              </button>
            </form>
            <section className="studio-panel">
              <h2>Купонууд</h2>
              {coupons.length === 0 ? (
                <p>Одоогоор купон алга.</p>
              ) : (
                coupons.map((c) => (
                  <div className="studio-row" key={c.id}>
                    <div>
                      <strong>{c.code}</strong>
                      <p>
                        {c.kind === "PERCENT" ? c.value + "%" : money(c.value)}{" "}
                        · {c.used}/{c.maxUses} ашигласан ·{" "}
                        {new Date(c.expiresAt).toLocaleDateString("mn-MN")}
                      </p>
                    </div>
                    <button
                      disabled={busy}
                      className="studio-btn secondary"
                      onClick={() =>
                        void act(() =>
                          api(
                            "/api/admin/operations/coupons/" + c.id,
                            "PATCH",
                            { active: !c.active },
                          ),
                        )
                      }
                    >
                      {c.active ? "Идэвхгүй болгох" : "Идэвхжүүлэх"}
                    </button>
                  </div>
                ))
              )}
            </section>
          </>
        )}
        {tab === "analytics" && report && (
          <>
            <div className="studio-stats">
              {[
                ["Давтагдаагүй зочид", report.visitors],
                ["Зочилсон өдрүүд", report.visits],
                ["Нээгдсэн карт", report.unlocked],
              ].map(([k, v]) => (
                <article key={k}>
                  <small>{k}</small>
                  <strong>{v}</strong>
                </article>
              ))}
            </div>
            <section className="studio-panel">
              <h2>Өдөр бүрийн хандалт</h2><TrendChart data={report.daily} metric="visits" label="Өдрийн хандалтын график"/>
              <p>
                Cookie-д суурилсан тооллого. IP хаяг, нэр цуглуулахгүй; нэг
                браузерыг өдөрт нэг удаа тоолно.
              </p>
              {report.daily.length ? (
                report.daily.map((d) => (
                  <div className="studio-chart" key={d.day}>
                    <small>{d.day}</small>
                    <meter
                      min={0}
                      max={Math.max(1, ...report.daily.map((x) => x.visits))}
                      value={d.visits}
                    />
                    <strong>{d.visits}</strong>
                  </div>
                ))
              ) : (
                <p>Энэ хугацаанд бүртгэл алга.</p>
              )}
            </section>
            <section className="studio-panel">
              <h2>Хамгийн их сонгосон карт</h2>
              {report.top.length ? (
                report.top.map((t) => (
                  <div className="studio-row" key={t.title}>
                    <span>{t.title}</span>
                    <strong>{t.count}</strong>
                  </div>
                ))
              ) : (
                <p>Одоогоор сонголт алга.</p>
              )}
            </section>
          </>
        )}
        {tab === "payments" && report && (
          <>
            <div className="studio-stats">
              <article>
                <small>Бодит орлого</small>
                <strong>{money(report.revenue)}</strong>
              </article>
              <article>
                <small>Амжилттай бодит төлбөр</small>
                <strong>{report.paid}</strong>
              </article>
            </div>
            <section className="studio-panel">
              <h2>Орлогын график</h2><TrendChart data={report.daily} metric="revenue" label="Өдрийн орлогын график"/>
              {report.daily.map((d) => (
                <div className="studio-chart" key={d.day}>
                  <small>{d.day}</small>
                  <meter
                    min={0}
                    max={Math.max(1, ...report.daily.map((x) => x.revenue))}
                    value={d.revenue}
                  />
                  <strong>{money(d.revenue)}</strong>
                </div>
              ))}
            </section>
            <section className="studio-panel">
              <div className="studio-toolbar">
                <h2>Төлбөрийн жагсаалт</h2>
                <select
                  aria-label="Төлбөрийн төлөв"
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                >
                  {["ALL", "PAID", "PENDING", "FAILED", "EXPIRED"].map((v) => (
                    <option key={v} value={v}>
                      {names[v] || "Бүгд"}
                    </option>
                  ))}
                </select>
              </div>
              {report.payments.filter(
                (p) => filter === "ALL" || p.status === filter,
              ).length === 0 && <p>Энэ хугацаанд төлбөр алга.</p>}
              {report.payments
                .filter((p) => filter === "ALL" || p.status === filter)
                .map((p) => (
                  <details className="studio-payment" key={p.id}>
                    <summary>
                      <span>
                        {p.selection.title}
                        <small>
                          {new Date(p.createdAt).toLocaleString("mn-MN", {
                            timeZone: "Asia/Ulaanbaatar",
                          })}
                        </small>
                      </span>
                      <span>
                        {money(p.amount)}
                        <small>
                          {names[p.status]} · {names[p.mode]}
                        </small>
                      </span>
                    </summary>
                    <p>Дугаар: {p.id}</p>
                    <p>Купон: {p.couponCode || "Ашиглаагүй"}</p>
                    {p.mode === "mock" && p.status === "PENDING" && (
                      <button
                        disabled={busy}
                        className="studio-btn"
                        onClick={() =>
                          void act(
                            () =>
                              api(
                                "/api/admin/payments/" + p.id + "/mock-confirm",
                                "POST",
                              ),
                            "Тестийн төлбөр баталлаа. Бодит орлогод ороогүй.",
                          )
                        }
                      >
                        Тестээр төлөгдсөн болгох
                      </button>
                    )}
                  </details>
                ))}
            </section>
          </>
        )}
        {tab === "team" && admin && (
          <>
            <section className="studio-panel">
              <h2>Эрхийн ялгаа</h2>
              <p>
                Админ: бүх хэсэг. Модератор: контент засах, нийтлэх, устгах.
                Редактор: зөвхөн ноорог бэлтгэх. Эрхийг сервер дээр шалгана.
              </p>
              {team.map((a) => (
                <div className="studio-row" key={a.id}>
                  <div>
                    <strong>{a.email}</strong>
                    <p>
                      {names[a.role]} · {a.active ? "Идэвхтэй" : "Идэвхгүй"}
                    </p>
                  </div>
                  {a.id !== me?.id && (
                    <div className="studio-toolbar">
                      <select
                        aria-label={a.email + " эрх"}
                        value={a.role}
                        disabled={busy}
                        onChange={(e) =>
                          void act(() =>
                            api("/api/admin/operations/team/" + a.id, "PATCH", {
                              role: e.target.value,
                              active: a.active,
                            }),
                          )
                        }
                      >
                        {["ADMIN", "MODERATOR", "EDITOR"].map((v) => (
                          <option value={v} key={v}>
                            {names[v]}
                          </option>
                        ))}
                      </select>
                      <button
                        disabled={busy}
                        className="studio-btn secondary"
                        onClick={() =>
                          void act(() =>
                            api("/api/admin/operations/team/" + a.id, "PATCH", {
                              role: a.role,
                              active: !a.active,
                            }),
                          )
                        }
                      >
                        {a.active ? "Хаах" : "Нээх"}
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </section>
            <form
              className="studio-panel"
              onSubmit={(e) => {
                const d = form(e);
                void act(
                  () =>
                    api(
                      "/api/admin/operations/team",
                      "POST",
                      Object.fromEntries(d),
                    ),
                  "Багийн гишүүн нэмэгдлээ.",
                );
              }}
            >
              <h2>Багийн гишүүн нэмэх</h2>
              <div className="studio-fields">
                <label>
                  Имэйл
                  <input name="email" type="email" required />
                </label>
                <label>
                  Анхны нууц үг
                  <input
                    name="password"
                    type="password"
                    minLength={12}
                    maxLength={128}
                    autoComplete="new-password"
                    required
                  />
                </label>
                <label>
                  Эрх
                  <select name="role">
                    {["EDITOR", "MODERATOR", "ADMIN"].map((v) => (
                      <option key={v} value={v}>
                        {names[v]}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <button disabled={busy} className="studio-btn">
                Нэмэх
              </button>
            </form>
            <section className="studio-panel">
              <h2>Үйлдлийн түүх</h2>
              {audit.map((a) => (
                <div className="studio-row" key={a.id}>
                  <span>
                    {a.action}
                    <small>{a.target}</small>
                  </span>
                  <small>{new Date(a.createdAt).toLocaleString("mn-MN")}</small>
                </div>
              ))}
            </section>
          </>
        )}
        {tab === "account" && (
          <form
            className="studio-panel"
            onSubmit={(e) => {
              const d = form(e);
              if (d.get("password") !== d.get("repeat")) {
                setError("Шинэ нууц үг давталттайгаа таарахгүй байна.");
                return;
              }
              void act(async () => {
                await api("/api/admin/operations/password", "POST", {
                  current: d.get("current"),
                  password: d.get("password"),
                });
                router.replace("/admin/login");
              }, "Нууц үг солигдлоо. Дахин нэвтэрнэ үү.");
            }}
          >
            <h2>Нууц үгээ солих</h2>
            <p>Амжилттай солигдоход өмнөх бүх нэвтрэлтийн эрх дуусна.</p>
            <div className="studio-fields">
              <label>
                Одоогийн нууц үг
                <input
                  name="current"
                  type="password"
                  autoComplete="current-password"
                  required
                />
              </label>
              <label>
                Шинэ нууц үг
                <input
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  minLength={12}
                  maxLength={128}
                  required
                />
              </label>
              <label>
                Шинэ нууц үг давтах
                <input
                  name="repeat"
                  type="password"
                  autoComplete="new-password"
                  minLength={12}
                  maxLength={128}
                  required
                />
              </label>
            </div>
            <button disabled={busy} className="studio-btn">
              Нууц үг солих
            </button>
          </form>
        )}
      </div>
    </main>
  );
}

export default function AdminPage() {
  return (
    <Suspense fallback={<main className="studio-panel">Уншиж байна…</main>}>
      <Dashboard />
    </Suspense>
  );
}
