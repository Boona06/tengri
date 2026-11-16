"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export default function AdminLoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (loading) return;

    setLoading(true);
    setError("");

    try {
      const response = await fetch(`${API_URL}/api/admin/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          email: email.trim(),
          password,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        setError(result.message || "Нэвтрэхэд алдаа гарлаа.");
        return;
      }

      router.replace("/admin");
      router.refresh();
    } catch {
      setError("Backend сервертэй холбогдож чадсангүй.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#0a0812] px-5 py-12 text-[#f4ead8]">
      <div className="pointer-events-none absolute left-1/2 top-1/3 h-80 w-80 -translate-x-1/2 rounded-full bg-[#987044]/10 blur-[110px]" />

      <div className="relative w-full max-w-md rounded-2xl border border-[#b99a65]/30 bg-[#15101b]/95 p-7 shadow-2xl sm:p-10">
        <div className="mb-9 text-center">
          <div className="mb-5 text-3xl text-[#d6b77d]">✧</div>

          <h1 className="text-xl font-semibold tracking-[0.25em] text-[#e1c58e]">
            TENGER ATLS
          </h1>

          <p className="mt-3 text-[10px] tracking-[0.35em] text-[#9f8b72]">
            ADMINISTRATION
          </p>

          <div className="mx-auto mt-7 h-px w-20 bg-[#a98c5b]/60" />

          <h2 className="mt-7 text-2xl font-light">Админ нэвтрэх</h2>

          <p className="mt-3 text-sm text-[#a99dad]">
            Удирдлагын хэсэгт нэвтэрнэ үү.
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label
              htmlFor="email"
              className="mb-2 block text-xs text-[#c5ad86]"
            >
              Имэйл хаяг
            </label>

            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="username"
              required
              placeholder="admin@example.com"
              className="w-full rounded-lg border border-[#9b8055]/35 bg-[#0d0a12] px-4 py-3 text-sm text-white outline-none transition focus:border-[#d0ad74]"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="mb-2 block text-xs text-[#c5ad86]"
            >
              Нууц үг
            </label>

            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
              placeholder="••••••••••••"
              className="w-full rounded-lg border border-[#9b8055]/35 bg-[#0d0a12] px-4 py-3 text-sm text-white outline-none transition focus:border-[#d0ad74]"
            />
          </div>

          {error && (
            <div
              role="alert"
              className="rounded-lg border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-300"
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-[#c5a46e] py-3.5 text-sm font-semibold tracking-[0.12em] text-[#100c12] transition hover:bg-[#e0be83] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "НЭВТЭРЧ БАЙНА..." : "НЭВТРЭХ"}
          </button>
        </form>

        <div className="mt-8 text-center">
          <Link
            href="/"
            className="text-xs text-[#9887a2] transition hover:text-[#e2c58d]"
          >
            ← Нүүр хуудас руу буцах
          </Link>
        </div>
      </div>
    </main>
  );
}
