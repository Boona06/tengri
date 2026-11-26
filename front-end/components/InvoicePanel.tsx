"use client";
/* eslint-disable @next/next/no-img-element -- QPay returns a base64 QR image. */
import { useState } from "react";
import type { Answer } from "../lib/cards";
import { parseAnswer } from "../lib/cards";
const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
type Invoice = {
  id: string;
  amount: number;
  status: string;
  mode: string;
  expiresAt: string;
  providerData: {
    qr_image?: string;
    urls?: { name: string; link: string; description?: string }[];
  } | null;
};
export default function InvoicePanel({
  selectionId,
  price,
  onPaid,
}: {
  selectionId: string;
  price: number;
  onPaid: (a: Answer) => void;
}) {
  const [coupon, setCoupon] = useState("");
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  async function run(check = false) {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const r = await fetch(
        API +
          "/api/journey/" +
          (check ? "payment/" + invoice!.id + "/check" : "invoice"),
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            check ? {} : { selectionId, coupon: coupon || undefined },
          ),
        },
      );
      const d = await r.json();
      if (!r.ok) throw Error(d.message || "Төлбөр шалгаж чадсангүй.");
      if (check) {
        if (d.data.unlocked) {
          onPaid(parseAnswer(d.data.answer, true));
          return;
        }
        setStatus(
          d.data.status === "EXPIRED"
            ? "Нэхэмжлэхийн хугацаа дууссан. Цонхоо хаагаад дахин сонгоно уу."
            : "Төлбөр хараахан баталгаажаагүй байна.",
        );
      } else {
        setInvoice(d.data);
        setStatus(
          d.data.mode === "mock"
            ? "Тестийн горим — бодит мөнгө авахгүй. Админ тестийн төлбөрийг баталсны дараа шалгана уу."
            : "Нэхэмжлэх бэлэн.",
        );
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Алдаа гарлаа.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="mt-6">
      <p className="mb-5 text-3xl text-[#193d37]">
        {(invoice?.amount ?? price).toLocaleString("en-US")}₮
      </p>
      {!invoice && (
        <>
          <label className="block text-left text-sm text-[#586e65]">
            Купон байгаа юу?
            <input
              className="mt-2 mb-4 w-full rounded-xl border border-[#a28aba55] bg-[#171020] p-3 uppercase"
              placeholder="Купоны код"
              value={coupon}
              onChange={(e) => setCoupon(e.target.value)}
              maxLength={30}
            />
          </label>
          <button
            disabled={busy}
            className="oracle-button w-full"
            onClick={() => void run()}
          >
            Нэхэмжлэх үүсгэх
          </button>
        </>
      )}
      {invoice && (
        <>
          {invoice.providerData?.qr_image && (
            <img
              alt="QPay төлбөрийн QR"
              className="mx-auto my-5 w-52 rounded-xl bg-white p-3"
              src={"data:image/png;base64," + invoice.providerData.qr_image}
            />
          )}
          <div className="flex flex-wrap justify-center gap-2">
            {invoice.providerData?.urls
              ?.filter((u) => !/^(javascript|data|vbscript):/i.test(u.link))
              .map((u) => (
                <a key={u.name} className="oracle-button" href={u.link}>
                  {u.description || u.name}
                </a>
              ))}
          </div>
          <button
            disabled={busy}
            className="oracle-button mt-5 w-full"
            onClick={() => void run(true)}
          >
            {busy ? "Шалгаж байна…" : "Төлбөр шалгах"}
          </button>
          <p className="mt-3 text-xs text-[#586e65]">
            Хүчинтэй хугацаа:{" "}
            {new Date(invoice.expiresAt).toLocaleTimeString("mn-MN")}
          </p>
        </>
      )}
      {status && (
        <p role="status" className="mt-4 text-sm leading-7 text-[#586e65]">
          {status}
        </p>
      )}
      {error && (
        <p role="alert" className="mt-4 text-sm text-rose-700">
          {error}
        </p>
      )}
    </div>
  );
}
