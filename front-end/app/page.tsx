"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import Modal from "../components/Modal";
import TarotFace from "../components/TarotFace";
import { FLIP_DURATION_MS, parseAnswer, parseCards, shuffle, type Answer, type Card } from "../lib/cards";
import { useReducedMotion } from "../lib/use-reduced-motion";

const OracleScene = dynamic(() => import("../components/OracleScene"), {
  ssr: false,
  loading: () => <p role="status" className="py-16 text-center text-[#bca582]">Картуудыг бэлтгэж байна…</p>,
});
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
type RevealedCard = { card: Card; answer: Answer };
function readableError(error: unknown, fallback: string) {
  if (error instanceof Error && error.name === "TimeoutError") return "Сервер удаан хариулж байна. Дахин оролдоно уу.";
  return error instanceof Error && /[А-Яа-яӨөҮү]/.test(error.message) ? error.message : fallback;
}

export default function Home() {
  const [cards, setCards] = useState<Card[]>([]);
  const [openedAnswers, setOpenedAnswers] = useState<Record<string, Answer>>({});
  const [pickerCard, setPickerCard] = useState<Card | null>(null);
  const [drawOptions, setDrawOptions] = useState<Answer[]>([]);
  const [revealingIndex, setRevealingIndex] = useState<number | null>(null);
  const [selectedCard, setSelectedCard] = useState<RevealedCard | null>(null);
  const [paymentCard, setPaymentCard] = useState<RevealedCard | null>(null);
  const [flippingId, setFlippingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reload, setReload] = useState(0);
  const selecting = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const revealRequest = useRef<AbortController | null>(null);
  const sequence = useRef(0);
  const trigger = useRef<HTMLElement | null>(null);
  const reduced = useReducedMotion();
  const openedCount = Object.keys(openedAnswers).length;
  const modalOpen = !!(pickerCard || selectedCard || paymentCard);

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      setLoading(true);
      setCards([]);
      setError("");
      try {
        const response = await fetch(API_URL + "/api/contents", {
          cache: "no-store", signal: AbortSignal.any([controller.signal, AbortSignal.timeout(15000)]),
        });
        const result = await response.json();
        if (!response.ok || !result.success) throw new Error(result.message || "Контент уншиж чадсангүй.");
        const nextCards = shuffle(parseCards(result.data));
        if (!controller.signal.aborted) setCards(nextCards);
      } catch (err) {
        if (!controller.signal.aborted) setError(readableError(err, "Сервертэй холбогдож чадсангүй. Дахин оролдоно уу."));
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void load();
    return () => {
      controller.abort();
      revealRequest.current?.abort();
      // This is a request generation counter, not a DOM ref. Invalidate outstanding work.
      // eslint-disable-next-line react-hooks/exhaustive-deps
      sequence.current++;
      if (timer.current) clearTimeout(timer.current);
    };
  }, [reload]);

  function chooseTopic(card: Card) {
    if (selecting.current || modalOpen) return;
    trigger.current = document.activeElement as HTMLElement;
    setError("");
    if (openedAnswers[card.id]) {
      setSelectedCard({ card, answer: openedAnswers[card.id] });
      return;
    }
    selecting.current = true;
    setFlippingId(card.id);
    setDrawOptions(shuffle(card.answers));
    timer.current = setTimeout(() => {
      setFlippingId(null);
      setPickerCard(card);
      selecting.current = false;
    }, reduced ? 0 : FLIP_DURATION_MS);
  }

  function chooseHiddenCard(index: number) {
    if (!pickerCard || revealingIndex !== null || selecting.current) return;
    const card = pickerCard;
    const answer = drawOptions[index];
    if (!answer) return;
    selecting.current = true;
    setRevealingIndex(index);
    setError("");
    const requestId = ++sequence.current;
    timer.current = setTimeout(async () => {
      if (requestId !== sequence.current) return;
      if (openedCount > 0) {
        setPickerCard(null);
        setRevealingIndex(null);
        selecting.current = false;
        setPaymentCard({ card, answer });
        return;
      }
      const controller = new AbortController();
      revealRequest.current = controller;
      try {
        const response = await fetch(API_URL + "/api/contents/" + encodeURIComponent(card.id)
          + "/answers/" + encodeURIComponent(answer.id) + "/reveal", {
          method: "POST", signal: AbortSignal.any([controller.signal, AbortSignal.timeout(15000)]),
        });
        const result = await response.json();
        if (controller.signal.aborted || requestId !== sequence.current) return;
        if (response.status === 402) {
          setPickerCard(null);
          setPaymentCard({ card, answer });
          return;
        }
        if (!response.ok || !result.success) throw new Error(result.message || "Хариулт уншиж чадсангүй.");
        const revealed = parseAnswer(result.data, true);
        if (revealed.id !== answer.id) throw new Error("Сонгосон картын мэдээлэл зөрсөн байна. Дахин оролдоно уу.");
        setOpenedAnswers(current => ({ ...current, [card.id]: revealed }));
        setPickerCard(null);
        setSelectedCard({ card, answer: revealed });
      } catch (err) {
        if (!controller.signal.aborted && requestId === sequence.current) setError(readableError(err, "Хариулт уншиж чадсангүй. Дахин сонгоно уу."));
      } finally {
        if (!controller.signal.aborted && requestId === sequence.current) {
          setRevealingIndex(null);
          selecting.current = false;
        }
      }
    }, reduced ? 0 : FLIP_DURATION_MS);
  }

  function closeModal() {
    ++sequence.current;
    revealRequest.current?.abort();
    if (timer.current) clearTimeout(timer.current);
    selecting.current = false;
    setError("");
    setPickerCard(null);
    setRevealingIndex(null);
    setSelectedCard(null);
    setPaymentCard(null);
    setFlippingId(null);
    const previous = trigger.current;
    requestAnimationFrame(() => previous?.focus({ preventScroll: true }));
  }

  return <main id="home" className="min-h-screen overflow-x-clip bg-[#0a0812] text-[#f4ead8]">
      {/* HEADER */}
      <header className="mx-auto flex max-w-7xl items-center justify-between px-4 py-5 sm:px-6 sm:py-7">
        <a href="#home" className="min-w-0">
          <div className="text-[15px] font-semibold tracking-[0.23em] text-[#d9bd83] sm:text-xl sm:tracking-[0.3em]">
            TENGER ATLS
          </div>

          <div className="mt-1 text-[8px] tracking-[0.3em] text-[#887b99] sm:text-[9px]">
            ДОТООД ЕРТӨНЦИЙН НУУЦ
          </div>
        </a>

        <nav className="hidden gap-8 text-xs tracking-widest text-[#b8aabb] md:flex">
          <a href="#home" className="hover:text-[#d9bd83]">
            НҮҮР
          </a>
          <a href="#cards" className="hover:text-[#d9bd83]">
            КАРТУУД
          </a>
          <a href="#about" className="hover:text-[#d9bd83]">
            БИДНИЙ ТУХАЙ
          </a>
        </nav>

        <span className="shrink-0 rounded-full border border-[#9b8055]/40 px-3 py-2 text-[10px] text-[#d9bd83] sm:px-4 sm:text-xs">
          ✧ Зөн билэг ✧
        </span>
      </header>

      {/* HERO */}
      <section className="relative mx-auto max-w-5xl px-5 pb-7 pt-8 text-center sm:px-6 sm:pb-12 sm:pt-16">
        <div className="pointer-events-none absolute left-1/2 top-0 h-64 w-64 -translate-x-1/2 rounded-full bg-[#683b91]/10 blur-[90px]" />

        <div className="relative">
          <div className="mb-4 text-xs tracking-[0.5em] text-[#b59b71] sm:mb-6 sm:text-sm">
            ✧ ✧ ✧
          </div>

          <p className="mb-4 text-[10px] tracking-[0.28em] text-[#a896b5] sm:mb-5 sm:text-xs sm:tracking-[0.45em]">
            ТАНЫГ ХҮЛЭЭЖ БУЙ НУУЦ
          </p>

          <h1 className="text-[clamp(1.9rem,8vw,3rem)] font-light leading-[1.25] tracking-[0.02em] sm:text-6xl sm:tracking-widest">
            Хариулт тань
            <span className="mt-1 block text-[#d8bd83] sm:mt-3">
              аль хэдийн энд бий
            </span>
          </h1>

          <p className="mx-auto mt-5 max-w-xl text-[13px] leading-6 text-[#a99dad] sm:mt-7 sm:text-sm sm:leading-8">
            Сэтгэлдээ нэгэн асуулт бодоод, доорх картуудаас зөн совингоороо
            нэгийг сонгоорой. Магадгүй таны хайж буй хариулт яг энд байж мэднэ.
          </p>

          <div className="mx-auto mt-6 h-px w-24 bg-gradient-to-r from-transparent via-[#c2a16a] to-transparent sm:mt-9" />

          <p className="mt-4 text-[11px] tracking-[0.2em] text-[#c4ad85] sm:mt-5 sm:text-xs">
            НЭГ СЭДЭВ СОНГООРОЙ
          </p>
        </div>
      </section>


    <section id="cards" aria-label="Карт сонгох" className="mx-auto max-w-7xl px-3 pb-12 sm:px-5 sm:pb-20">
      <div className="mx-auto mb-6 flex max-w-5xl items-center justify-between gap-3 px-2">
        <p className="text-[10px] tracking-[0.16em] text-[#9c8aa7] sm:text-xs">{cards.length} НУУЦ СЭДЭВ / АСУУЛТ</p>
        <p className="text-right text-xs text-[#b49a6f]">{openedCount === 0 ? "Эхний карт үнэгүй" : "Дараагийн карт · 3,000₮"}</p>
      </div>
      {loading && <div role="status" className="oracle-loading"><span aria-hidden="true">✧</span><p>Картуудыг уншиж байна…</p></div>}
      {!modalOpen && error && <div role="alert" className="py-8 text-center text-sm text-[#dfc48e]">
        <p>{error}</p><button type="button" disabled={loading} onClick={() => setReload(value => value + 1)} className="oracle-button mt-4">Дахин ачаалах</button>
      </div>}
      {!loading && !error && cards.length === 0 && <p role="status" className="py-16 text-center text-sm text-[#a99dad]">Одоогоор нийтэлсэн карт алга байна. Удахгүй дахин зочлоорой.</p>}
      {!loading && cards.length > 0 && <OracleScene cards={cards} flippingId={flippingId}
        disabled={!!flippingId || modalOpen} paused={modalOpen} onSelect={id => { const card = cards.find(item => item.id === id); if (card) chooseTopic(card); }} />}
      <p className="mt-8 text-center text-xs tracking-[0.2em] text-[#b49a6f]">ЗӨН СОВИНГОО ДАГААРАЙ</p>
    </section>
    <footer id="about" className="border-t border-[#8e754c]/20 px-6 py-8 text-center">
      <p className="text-xs tracking-[0.3em] text-[#9d8969]">TENGER ATLS</p>
      <p className="mx-auto mt-3 max-w-xl text-xs leading-6 text-[#a99dad]">Насанд хүрэгчдэд зориулсан зөгнөлт тайлбар, өөрийгөө эргэцүүлэх аялал. Эдгээр тайлбар нь бодит үйл явдлын баталгаа, мэргэжлийн зөвлөгөө биш.</p>
    </footer>
    {pickerCard && <Modal key="picker" title="Гурван хариултаас сонгох" onClose={closeModal}>
      <p className="eyebrow">{pickerCard.type === "TOPIC" ? "СЭДЭВ" : "АСУУЛТ"}</p>
      <h2 className="mt-3 text-xl text-[#e8d5b3]">{pickerCard.title}</h2>
      {pickerCard.question && <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-[#c6b8ca]">{pickerCard.question}</p>}
      <h3 className="mt-5 text-xl text-[#f0e0c4]">Гурван нууц картаас нэгийг сонго</h3>
      <p className="mt-3 text-xs leading-6 text-[#a99dad]">Карт бүр өөрийн хариулттай. Зөн совингоо дагаарай.</p>
      <div className="mx-auto mt-8 grid max-w-[475px] grid-cols-3 gap-3 sm:gap-5">
        {drawOptions.map((answer, index) => <button key={answer.id} type="button" aria-label={"Нууц карт " + (index + 1) + " сонгох"}
          aria-busy={revealingIndex === index} disabled={revealingIndex !== null} onClick={() => chooseHiddenCard(index)}
          className={"answer-choice " + (revealingIndex === index ? "is-flipping" : "")}>
          <span className="flat-flip"><span className="flat-front"><TarotFace image={answer.imageUrl} symbol={answer.iconName} title={"Сонголт " + (index + 1)} /></span>
          <span className="flat-back"><TarotFace image={answer.backImageUrl} symbol={answer.iconName} title={"Сонголт " + (index + 1)} back /></span></span>
        </button>)}
      </div>
      {revealingIndex !== null && <p role="status" className="mt-5 text-sm text-[#dfc48e]">Хариултыг нээж байна…</p>}
      {error && <p role="alert" className="mt-5 text-sm text-red-300">{error}</p>}
    </Modal>}
    {selectedCard && <Modal key="answer" title="Таны хариулт" onClose={closeModal}>
      <div className="mx-auto mb-6 aspect-[2/3] w-28 sm:w-32"><TarotFace image={selectedCard.answer.imageUrl} symbol={selectedCard.answer.iconName} title={selectedCard.card.title} /></div>
      <p className="eyebrow">ТАНЫ ХАРИУЛТ</p>
      <h2 className="mt-4 text-2xl text-[#e8d5b3]">{selectedCard.card.title}</h2>
      {selectedCard.card.question && <h3 className="mt-6 whitespace-pre-wrap text-base leading-8 text-[#f0e4d0]">{selectedCard.card.question}</h3>}
      <p className="mt-6 whitespace-pre-wrap text-left text-base leading-8 text-[#c6b8ca]">{selectedCard.answer.text}</p>
      <button type="button" onClick={closeModal} className="oracle-button mt-8">Бусад карт руу буцах</button>
    </Modal>}
    {paymentCard && <Modal key="payment" title="Картын төлбөр" onClose={closeModal}>
      <p className="eyebrow">НУУЦЫГ ТАЙЛАХ</p>
      <h2 className="mt-4 text-xl text-[#e8d5b3]">{paymentCard.card.title}</h2>
      <p className="mt-4 text-sm leading-7 text-[#b9aabd]">Энэ картын хариултыг нээхэд төлбөр шаардлагатай.</p>
      <p className="my-7 text-3xl text-[#e2c28a]">3,000₮</p>
      <p role="status" className="mb-6 text-sm leading-6 text-[#a396a9]">QPay хараахан холбогдоогүй тул одоогоор төлбөр авахгүй, төлбөртэй хариулт нээхгүй.</p>
      <button type="button" disabled className="oracle-button w-full">QPay удахгүй</button>
      <button type="button" onClick={closeModal} className="oracle-button mt-5">Буцах</button>
    </Modal>}
  </main>;
}
