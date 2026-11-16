"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

type Admin = {
  id: string;
  email: string;
};

export default function AdminDashboard() {
  const router = useRouter();

  const [admin, setAdmin] = useState<Admin | null>(null);
  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    let active = true;

    async function checkAdmin() {
      try {
        const response = await fetch(`${API_URL}/api/admin/me`, {
          credentials: "include",
          cache: "no-store",
        });

        if (!response.ok) {
          router.replace("/admin/login");
          return;
        }

        const result = await response.json();

        if (!result.success || !result.admin) {
          router.replace("/admin/login");
          return;
        }

        if (active) {
          setAdmin(result.admin);
        }
      } catch {
        router.replace("/admin/login");
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    checkAdmin();

    return () => {
      active = false;
    };
  }, [router]);

  async function logout() {
    if (loggingOut) return;

    setLoggingOut(true);

    try {
      const response = await fetch(`${API_URL}/api/admin/logout`, {
        method: "POST",
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Гарах үед алдаа гарлаа.");
      }

      router.replace("/admin/login");
      router.refresh();
    } catch {
      alert("Системээс гарахад алдаа гарлаа. Дахин оролдоно уу.");
      setLoggingOut(false);
    }
  }

  if (loading || !admin) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#0a0812] text-[#d6b77d]">
        <p className="text-xs tracking-[0.3em]">ШАЛГАЖ БАЙНА...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#0a0812] text-[#f4ead8]">
      <header className="border-b border-[#b99a65]/20">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-6">
          <div>
            <h1 className="text-lg font-semibold tracking-[0.22em] text-[#d6b77d]">
              TENGER ATLS
            </h1>

            <p className="mt-1 text-[10px] tracking-[0.25em] text-[#9582a1]">
              ADMIN DASHBOARD
            </p>
          </div>

          <button
            type="button"
            onClick={logout}
            disabled={loggingOut}
            className="rounded-full border border-[#b99a65]/40 px-5 py-2.5 text-xs text-[#d6b77d] transition hover:bg-[#b99a65]/10 disabled:opacity-60"
          >
            {loggingOut ? "ТҮР ХҮЛЭЭ..." : "ГАРАХ"}
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-5 py-10">
        <div className="mb-10">
          <p className="text-xs text-[#a99dad]">Тавтай морилно уу</p>

          <h2 className="mt-2 text-2xl font-light text-[#ead8b6] sm:text-3xl">
            Удирдлагын самбар
          </h2>

          <p className="mt-3 text-sm text-[#b4a3bc]">{admin.email}</p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[
            {
              symbol: "◈",
              title: "Сэдэв ба асуултууд",
              description: "Шинэ сэдэв, асуулт нэмэх болон засварлах.",
            },
            {
              symbol: "✧",
              title: "Карт ба хариултууд",
              description: "Картын зураг, icon болон 3 хариултыг удирдах.",
            },
            {
              symbol: "◇",
              title: "Үнэ ба тохиргоо",
              description: "Картын үнэ, үнэгүй сонголтыг тохируулах.",
            },
            {
              symbol: "◷",
              title: "Хэрэглэгчдийн тайлан",
              description: "Өдөр, сар, жилийн хандалтыг харах.",
            },
            {
              symbol: "₮",
              title: "Төлбөр ба орлого",
              description: "QPay төлбөр болон орлогын мэдээлэл.",
            },
            {
              symbol: "⚙",
              title: "Админ тохиргоо",
              description: "Нэвтрэх эрх, бүртгэлийн тохиргоо.",
            },
          ].map((item) => (
            <div
              key={item.title}
              className="rounded-xl border border-[#b99a65]/25 bg-[#15101b] p-6"
            >
              <div className="mb-5 text-3xl text-[#d6b77d]">{item.symbol}</div>

              <h3 className="text-base font-medium text-[#ead8b6]">
                {item.title}
              </h3>

              <p className="mt-3 text-sm leading-6 text-[#a99dad]">
                {item.description}
              </p>
              {item.title === "Сэдэв ба асуултууд" && (
                <a
                  href="/admin/contents"
                  className="mt-4 inline-block rounded-lg border border-[#b99a65]/50 px-4 py-2 text-xs text-[#e1c58e] hover:bg-[#b99a65]/10"
                >
                  КОНТЕНТ УДИРДАХ →
                </a>
              )}
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
