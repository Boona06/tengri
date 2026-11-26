"use client";
/* eslint-disable @next/next/no-img-element -- Admin images are lazy-loaded external assets. */

import { useEffect, useRef, useState } from "react";
import InvoicePanel from "../components/InvoicePanel";
import Modal from "../components/Modal";
import TarotFace from "../components/TarotFace";
import {
  FLIP_DURATION_MS,
  parseAnswer,
  parseCards,
  shuffle,
  type Answer,
  type Card,
} from "../lib/cards";
import { useReducedMotion } from "../lib/use-reduced-motion";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
type RevealedCard = { card: Card; answer: Answer; selectionId?: string };
function readableError(error: unknown, fallback: string) {
  if (error instanceof Error && error.name === "TimeoutError")
    return "Сервер удаан хариулж байна. Дахин оролдоно уу.";
  return error instanceof Error && /[А-Яа-яӨөҮү]/.test(error.message)
    ? error.message
    : fallback;
}

export default function Home() {
  const [settings, setSettings] = useState({
    cardPriceMnt: 3000,
    firstCardFree: true,
    siteName: "TENGER ATLS",
  });
  const [visible, setVisible] = useState(12);
  const [view, setView] = useState("all");
  const [cards, setCards] = useState<Card[]>([]);
  const [openedAnswers, setOpenedAnswers] = useState<Record<string, Answer>>(
    {},
  );
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
        const sessionResponse = await fetch(API_URL + "/api/journey/session", {
          credentials: "include",
          cache: "no-store",
          signal: controller.signal,
        });
        const session = await sessionResponse.json();
        if (!sessionResponse.ok)
          throw new Error(session.message || "Холбогдож чадсангүй.");
        if (!controller.signal.aborted) {
          setSettings(session.data.settings);
          setOpenedAnswers(
            Object.fromEntries(
              session.data.selections.map(
                (v: { contentId: string; answer: unknown }) => [
                  v.contentId,
                  parseAnswer(v.answer, true),
                ],
              ),
            ),
          );
        }
        const response = await fetch(API_URL + "/api/contents", {
          cache: "no-store",
          signal: AbortSignal.any([
            controller.signal,
            AbortSignal.timeout(15000),
          ]),
        });
        const result = await response.json();
        if (!response.ok || !result.success)
          throw new Error(result.message || "Контент уншиж чадсангүй.");
        const nextCards = shuffle(parseCards(result.data));
        if (!controller.signal.aborted) setCards(nextCards);
      } catch (err) {
        if (!controller.signal.aborted)
          setError(
            readableError(
              err,
              "Сервертэй холбогдож чадсангүй. Дахин оролдоно уу.",
            ),
          );
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

  function chooseTopic(card: Card, continuing = false) {
    if (selecting.current || (modalOpen && !continuing)) return;
    trigger.current = document.activeElement as HTMLElement;
    setError("");
    if (openedAnswers[card.id]) {
      setSelectedCard({ card, answer: openedAnswers[card.id] });
      return;
    }
    selecting.current = true;
    setFlippingId(card.id);
    setDrawOptions(shuffle(card.answers));
    timer.current = setTimeout(
      () => {
        setFlippingId(null);
        setPickerCard(card);
        selecting.current = false;
      },
      reduced ? 0 : FLIP_DURATION_MS,
    );
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
    timer.current = setTimeout(
      async () => {
        if (requestId !== sequence.current) return;
        const controller = new AbortController();
        revealRequest.current = controller;
        try {
          const response = await fetch(API_URL + "/api/journey/select", {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ contentId: card.id, answerId: answer.id }),
            signal: AbortSignal.any([
              controller.signal,
              AbortSignal.timeout(15000),
            ]),
          });
          const result = await response.json();
          if (controller.signal.aborted || requestId !== sequence.current)
            return;
          if (response.status === 402) {
            setPickerCard(null);
            setPaymentCard({
              card,
              answer,
              selectionId: result.data.selectionId,
            });
            return;
          }
          if (!response.ok || !result.success)
            throw new Error(result.message || "Хариулт уншиж чадсангүй.");
          const revealed = parseAnswer(result.data, true);

          setOpenedAnswers((current) => ({ ...current, [card.id]: revealed }));
          setPickerCard(null);
          setSelectedCard({ card, answer: revealed });
        } catch (err) {
          if (!controller.signal.aborted && requestId === sequence.current)
            setError(
              readableError(err, "Хариулт уншиж чадсангүй. Дахин сонгоно уу."),
            );
        } finally {
          if (!controller.signal.aborted && requestId === sequence.current) {
            setRevealingIndex(null);
            selecting.current = false;
          }
        }
      },
      reduced ? 0 : FLIP_DURATION_MS,
    );
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

  return (
    <main
      id="home"
      data-theme="atlas"
      className="min-h-screen overflow-x-clip bg-[#0a0812] text-[#f4ead8]"
    >
      <header className="atlas-header">
        <a href="#home" className="atlas-logo">
          <span aria-hidden="true">✳</span>
          {settings.siteName}
          <small>ЧИНИЙ АСУУЛТ. ЧИНИЙ СОНГОЛТ.</small>
        </a>
        <nav aria-label="Үндсэн цэс">
          <button
            className={view === "all" ? "active" : ""}
            onClick={() => setView("all")}
          >
            Бүх асуулт
          </button>
          <button
            className={view === "mine" ? "active" : ""}
            onClick={() => setView("mine")}
          >
            Миний картууд <span>{openedCount}</span>
          </button>
        </nav>
      </header>
      <section className="atlas-intro">
        <div>
          <span className="atlas-kicker">ӨӨР ӨНЦГӨӨС ХАРААД ҮЗЬЕ</span>
          <h1>
            Нэг асуулт.
            <br />
            <em>Олон боломж.</em>
          </h1>
          <p>
            Сонирхсон сэдвээ сонгоод гурван картаас нэгийг нээ. Хариултын дараа
            дараагийн асуултаар үргэлжлүүлж болно.
          </p>
        </div>
        <div className="atlas-note">
          <span aria-hidden="true">↗</span>
          <p>
            {settings.firstCardFree
              ? "Эхний сонголт биднээс."
              : "Өөртөө хэдэн хором гарга."}
          </p>
          <small>
            Дараагийн шинэ карт ·{" "}
            {settings.cardPriceMnt.toLocaleString("en-US")}₮
          </small>
        </div>
      </section>
      <section id="cards" className="atlas-catalogue" aria-label="Карт сонгох">
        <div className="atlas-section-title">
          <h2>
            {view === "mine" ? "Чиний нээсэн картууд" : "Юу сонирхож байна?"}
          </h2>
          <span>{view === "mine" ? openedCount : cards.length} сонголт</span>
        </div>
        {loading && <p role="status">Картуудыг бэлтгэж байна…</p>}
        {!modalOpen && error && (
          <div role="alert">
            <p>{error}</p>
            <button
              className="oracle-button"
              onClick={() => setReload((v) => v + 1)}
            >
              Дахин ачаалах
            </button>
          </div>
        )}
        {!loading && !error && cards.length === 0 && (
          <p role="status">
            Одоогоор нийтэлсэн карт алга байна. Удахгүй дахин зочлоорой.
          </p>
        )}
        {!loading && view === "mine" && openedCount === 0 && (
          <p className="atlas-empty">
            Одоогоор карт нээгээгүй байна. Сонирхсон асуултаасаа эхлээрэй.
          </p>
        )}
        <div className="atlas-grid" role="group" aria-label="Зөгнөлт картууд">
          {cards
            .filter((c) => view === "all" || openedAnswers[c.id])
            .slice(0, visible)
            .map((card, index) => (
              <button
                type="button"
                key={card.id}
                aria-label={card.title + " — карт сонгох"}
                disabled={!!flippingId || modalOpen}
                onClick={() => chooseTopic(card)}
                className={
                  "atlas-card tone-" +
                  (index % 6) +
                  (flippingId === card.id ? " choosing" : "")
                }
              >
                <div className="atlas-card-top">
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  <span className="atlas-symbol" aria-hidden="true">
                    {card.symbol || "✳"}
                  </span>
                </div>
                {card.cover && (
                  <img
                    src={card.cover}
                    alt=""
                    loading="lazy"
                    className="atlas-cover"
                  />
                )}
                <h3>{card.title}</h3>
                {card.question && card.question !== card.title && (
                  <p>{card.question}</p>
                )}
                <div className="atlas-card-bottom">
                  <span>
                    {openedAnswers[card.id]
                      ? "Дахин унших"
                      : openedCount === 0 && settings.firstCardFree
                        ? "Үнэгүй эхлэх"
                        : settings.cardPriceMnt.toLocaleString("en-US") + "₮"}
                    <small>
                      {openedAnswers[card.id]
                        ? "Нээгдсэн карт"
                        : "3 картаас нэгийг сонгоно"}
                    </small>
                  </span>
                  <span className="atlas-arrow" aria-hidden="true">
                    ↗
                  </span>
                </div>
              </button>
            ))}
        </div>
        {cards.filter((c) => view === "all" || openedAnswers[c.id]).length >
          visible && (
          <button
            className="atlas-more"
            onClick={() => setVisible((v) => v + 12)}
          >
            Илүү олон асуулт үзэх ↓
          </button>
        )}
      </section>
      <footer className="atlas-footer">
        <strong>{settings.siteName}</strong>
        <p>
          Хариулт бүрийг зүгээр л нэг шинэ өнцөг гэж хүлээж аваарай.
          <br />
          18+ · Зугаа, өөрийгөө эргэцүүлэх зориулалттай. Бодит үйл явдлын
          баталгаа биш.
        </p>
      </footer>
      {pickerCard && (
        <Modal
          key="picker"
          title="Гурван хариултаас сонгох"
          onClose={closeModal}
        >
          <p className="eyebrow">
            {pickerCard.type === "TOPIC" ? "СЭДЭВ" : "АСУУЛТ"}
          </p>
          <h2 className="mt-3 text-xl text-[#193d37]">{pickerCard.title}</h2>
          {pickerCard.question && (
            <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-[#586e65]">
              {pickerCard.question}
            </p>
          )}
          <h3 className="mt-5 text-xl text-[#193d37]">
            Гурван нууц картаас нэгийг сонго
          </h3>
          <p className="mt-3 text-xs leading-6 text-[#586e65]">
            Карт бүр өөрийн хариулттай. Зөн совингоо дагаарай.
          </p>
          <div className="mx-auto mt-8 grid max-w-[475px] grid-cols-3 gap-3 sm:gap-5">
            {drawOptions.map((answer, index) => (
              <button
                key={answer.id}
                type="button"
                aria-label={"Нууц карт " + (index + 1) + " сонгох"}
                aria-busy={revealingIndex === index}
                disabled={revealingIndex !== null}
                onClick={() => chooseHiddenCard(index)}
                className={
                  "answer-choice " +
                  (revealingIndex === index ? "is-flipping" : "")
                }
              >
                <span className="flat-flip">
                  <span className="flat-front">
                    <TarotFace
                      image={answer.imageUrl}
                      symbol={answer.iconName}
                      title={"Сонголт " + (index + 1)}
                    />
                  </span>
                  <span className="flat-back">
                    <TarotFace
                      image={answer.backImageUrl}
                      symbol={answer.iconName}
                      title={"Сонголт " + (index + 1)}
                      back
                    />
                  </span>
                </span>
              </button>
            ))}
          </div>
          {revealingIndex !== null && (
            <p role="status" className="mt-5 text-sm text-[#193d37]">
              Хариултыг нээж байна…
            </p>
          )}
          {error && (
            <p role="alert" className="mt-5 text-sm text-red-700">
              {error}
            </p>
          )}
        </Modal>
      )}
      {selectedCard && (
        <Modal key="answer" title="Таны хариулт" onClose={closeModal}>
          <div className="mx-auto mb-6 aspect-[2/3] w-28 sm:w-32">
            <TarotFace
              image={selectedCard.answer.imageUrl}
              symbol={selectedCard.answer.iconName}
              title={selectedCard.card.title}
            />
          </div>
          <p className="eyebrow">ТАНЫ ХАРИУЛТ</p>
          <h2 className="mt-4 text-2xl text-[#193d37]">
            {selectedCard.card.title}
          </h2>
          {selectedCard.card.question && (
            <h3 className="mt-6 whitespace-pre-wrap text-base leading-8 text-[#193d37]">
              {selectedCard.card.question}
            </h3>
          )}
          <p className="mt-6 whitespace-pre-wrap text-left text-base leading-8 text-[#586e65]">
            {selectedCard.answer.text}
          </p>
          {(() => {
            const nextId =
              cards
                .find((c) => c.id === selectedCard.card.id)
                ?.answers.find((a) => a.id === selectedCard.answer.id)
                ?.nextContentId || selectedCard.answer.nextContentId;
            const next = cards.find((c) => c.id === nextId && c.id !== selectedCard.card.id);
            const remaining = cards.filter((c) => c.id !== selectedCard.card.id && c.id !== next?.id && !openedAnswers[c.id]);
            const suggestions = next ? [next, ...remaining] : remaining;
            return suggestions.length ? (
              <section className="atlas-continuation" aria-label="Үргэлжлүүлэх асуултууд">
                <h3 className="mt-8 text-lg font-semibold">Цааш юу сонирхож байна?</h3>
                <p className="mt-2 text-sm text-[#586e65]">Дараагийн асуултаа сонгоод үргэлжлүүлээрэй.</p>
                <div className="atlas-suggestions">
                {suggestions.map((next, index) => (
              <button
                key={next.id}
                className="atlas-next"
                onClick={() => {
                  setSelectedCard(null);
                  chooseTopic(next, true);
                }}
              >
                <small>{index === 0 ? "ДАРААГИЙН АСУУЛТ" : "БАС СОНИРХОЖ БОЛОХ АСУУЛТ"}</small>
                <strong>{next.title}</strong>
                <span>{openedAnswers[next.id] ? "Дахин унших" : settings.cardPriceMnt.toLocaleString("en-US") + "₮ · Үргэлжлүүлэх"} ↗</span>
              </button>
                ))}
                </div>
              </section>
            ) : (
              <p className="mt-6 text-sm">
                Одоогоор нийтлэгдсэн бүх асуултыг уншлаа. Шинэ асуулт нэмэгдэхээр эндээс үргэлжлүүлээрэй.
              </p>
            );
          })()}
          <button
            type="button"
            onClick={closeModal}
            className="mt-8 text-sm underline underline-offset-4 text-[#586e65]"
          >
            Түр завсарлах
          </button>
        </Modal>
      )}
      {paymentCard && (
        <Modal key="payment" title="Картын төлбөр" onClose={closeModal}>
          <p className="eyebrow">НУУЦЫГ ТАЙЛАХ</p>
          <h2 className="mt-4 text-xl text-[#193d37]">
            {paymentCard.card.title}
          </h2>
          <p className="mt-4 text-sm leading-7 text-[#586e65]">
            Энэ картын хариултыг нээхэд төлбөр шаардлагатай.
          </p>
          {paymentCard.selectionId && (
            <InvoicePanel
              selectionId={paymentCard.selectionId}
              price={settings.cardPriceMnt}
              onPaid={(answer) => {
                setOpenedAnswers((current) => ({
                  ...current,
                  [paymentCard.card.id]: answer,
                }));
                setSelectedCard({ card: paymentCard.card, answer });
                setPaymentCard(null);
              }}
            />
          )}
          <button
            type="button"
            onClick={closeModal}
            className="oracle-button mt-5"
          >
            Буцах
          </button>
        </Modal>
      )}
    </main>
  );
}
