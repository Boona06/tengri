"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";

const OracleScene = dynamic(() => import("../components/OracleScene"), {
  ssr: false,
});

type Card = {
  id: number;
  symbol: string;
  title: string;
  question: string;
  answer: string;
  cover?: string;
};

const initialCards: Card[] = [
  {
    id: 1,
    symbol: "☀",
    title: "Нар",
    question: "Таны амьдралд ойрын үед ямар шинэ боломж ирэх вэ?",
    answer:
      "Таны өмнө шинэ эхлэл нээгдэж байна. Удаан хугацаанд хүлээсэн боломж тань ойртож байгаа бөгөөд өөртөө итгэлтэй алхам хийх цаг болжээ.",
    cover: "/cards/card-01.jpg",
  },
  {
    id: 2,
    symbol: "☾",
    title: "Сар",
    question: "Таны дотор нуугдаж буй хамгийн том хүсэл юу вэ?",
    answer:
      "Таны сэтгэлд удаан хадгалагдсан нэгэн хүсэл байна. Түүнийг үл тоомсорлохын оронд өөрийнхөө жинхэнэ хүсэл юу болохыг тунгаагаарай.",
    cover: "/cards/card-02.jpg",
  },
  {
    id: 3,
    symbol: "♡",
    title: "Хайр",
    question: "Хайр дурлалын талбарт таныг юу хүлээж байна вэ?",
    answer:
      "Сэтгэлийн холбоо улам гүнзгийрэх боломж байна. Гэхдээ бусдаас хүсэх хайраа өөртөө ч бас өгөхөө бүү мартаарай.",
    cover: "/cards/card-01.jpg",
  },
  {
    id: 4,
    symbol: "♛",
    title: "Хаан",
    question: "Таны ажил, карьерын дараагийн алхам юу байх вэ?",
    answer:
      "Таны ур чадвар, тууштай байдал үр дүнгээ өгөх үе ойртож байна. Өөрийн үнэ цэнийг мэдэрч, боломжийг зоригтой ашиглаарай.",
    cover: "/cards/card-02.jpg",
  },
  {
    id: 5,
    symbol: "✧",
    title: "Од",
    question: "Таны ирээдүйн хамгийн гэгээлэг боломж юу вэ?",
    answer:
      "Таны өмнө итгэл найдвар төрүүлэх үйл явдал гарч ирнэ. Жижиг мэт санагдах боломжийг анзаараарай.",
    cover: "/cards/card-01.jpg",
  },
  {
    id: 6,
    symbol: "♧",
    title: "Аз",
    question: "Мөнгө санхүүгийн тал дээр ямар өөрчлөлт ирэх вэ?",
    answer:
      "Санхүүгийн байдал тань илүү цэгцтэй болох боломжтой. Орлогоо нэмэгдүүлэхийн зэрэгцээ зарлагаа ухаалгаар төлөвлөөрэй.",
    cover: "/cards/card-02.jpg",
  },
  {
    id: 7,
    symbol: "♧",
    title: "Мод",
    question: "Таны амьдралд юуг орхих цаг болсон бэ?",
    answer:
      "Танд цаашид хэрэггүй болсон хуучин бодол, дадал бий. Тэдгээрээс салж чадвал шинэ боломжид зай гарна.",
    cover: "/cards/card-01.jpg",
  },
  {
    id: 8,
    symbol: "♜",
    title: "Зам",
    question: "Таныг ямар шинэ аялал, өөрчлөлт хүлээж байна вэ?",
    answer:
      "Таны хэвшсэн орчноос өөр шинэ зүйлтэй танилцах боломж гарч мэднэ. Өөрчлөлтөөс бүү ай.",
    cover: "/cards/card-02.jpg",
  },
  {
    id: 9,
    symbol: "♢",
    title: "Эрдэнэ",
    question: "Таны хамгийн том авьяас юу вэ?",
    answer:
      "Таны өөрөө анзаараагүй нэгэн чадвар бий. Түүнийгээ хөгжүүлэхэд цаг гаргавал шинэ үр дүнг мэдрэх болно.",
    cover: "/cards/card-01.jpg",
  },
  {
    id: 10,
    symbol: "∞",
    title: "Хувь",
    question: "Таны амьдралд ямар чухал уулзалт тохиох бол?",
    answer:
      "Шинэ танил эсвэл хуучин холбоо дахин сэргэх боломж байна. Хүмүүстэй харилцахдаа нээлттэй байгаарай.",
    cover: "/cards/card-02.jpg",
  },
  {
    id: 11,
    symbol: "♨",
    title: "Гал",
    question: "Таныг хамгийн их өөрчлөх зүйл юу байх вэ?",
    answer:
      "Таны зориг гарган хийсэн нэг шийдвэр амьдралын тань чиглэлийг өөрчилж мэднэ. Яаралгүй бодож, өөртөө итгээрэй.",
    cover: "/cards/card-01.jpg",
  },
  {
    id: 12,
    symbol: "✦",
    title: "Тэнгэр",
    question: "Таны хүсэл биелэхэд юу хамгийн их нөлөөлөх вэ?",
    answer:
      "Хүсэл мөрөөдөл тань зөвхөн хүлээлтээр биелэхгүй. Түүн рүү чиглэсэн жижиг боловч бодит алхмаа өнөөдрөөс эхлүүлээрэй.",
    cover: "/cards/card-02.jpg",
  },
];

// Сэдэв бүрт 2 нэмэлт хариулт.
// Анхны хариулт нь initialCards дотор байгаа.

const extraAnswers: Record<number, [string, string]> = {
  1: [
    "Ойрын үед танил орчноос тань шинэ боломж урган гарч мэднэ. Өмнө нь анзаараагүй жижиг санал, уулзалтад анхаарлаа хандуулаарай.",
    "Таны өөрөө эхлүүлсэн нэгэн ажил шинэ хаалга нээж болох юм. Бусдын зөвшөөрлийг хүлээхийн оронд эхний алхмаа хийж үзээрэй.",
  ],
  2: [
    "Таны сэтгэлд хэнд ч хэлээгүй нэгэн мөрөөдөл бий бололтой. Түүнийг бодит болгохын тулд юунаас эхлэхээ өөрөөсөө асуугаарай.",
    "Та өөрийгөө сонсох завгүй явсан байж мэднэ. Нам гүмхэн үедээ үнэхээр хүсэж буй зүйлээ бичиж үзвэл хариулт тодорно.",
  ],
  3: [
    "Ойлголцол хамгийн энгийн ярианаас эхэлдэг. Сэтгэлээ нуухын оронд тайван, үнэнээр нь илэрхийлэх үе иржээ.",
    "Шинэ дотно холбоо үүсэх эсвэл хуучин харилцаа өөр өнгөөр харагдаж мэднэ. Гэхдээ өөрийн хил хязгаарыг мартаж болохгүй.",
  ],
  4: [
    "Хийж чаддаг зүйлээ бусдад харуулах боломж ойртож байна. Зөв цагийг хүлээхээс илүү бэлтгэлээ өнөөдрөөс эхлүүлээрэй.",
    "Ажил мэргэжлийн замд хоёр сонголт гарч мэднэ. Түр зуурын ашиг бус, урт хугацаанд өсөх боломжийг нь бодолцоорой.",
  ],
  5: [
    "Танд урам өгөх мэдээ эсвэл хүнтэй учрах боломж бий. Тэр мөчийг хүлээхдээ өдөр тутмын жижиг баяр баяслыг ч анзаараарай.",
    "Таны гэгээлэг боломж шинэ зүйл сурах, туршиж үзэхээс эхэлж магадгүй. Сониуч зангаа дагах зориг гаргаарай.",
  ],
  6: [
    "Орлогоо нэмэгдүүлэхээс өмнө зарлагаа ажиглах нь танд илүү их эрх чөлөө өгөх боломжтой. Жижиг дүн ч хуримтлалын эхлэл болдог.",
    "Санхүүгийн шинэ санал гарч ирж болох ч яарах хэрэггүй. Нөхцөлөө нягталж, бодит тооцоонд тулгуурлан шийдээрэй.",
  ],
  7: [
    "Өөрийгөө байнга буруутгадаг бодлоо орхих цаг ирсэн байж мэднэ. Өнгөрсөн алдаанаас суралцаад цааш алхахад хангалттай.",
    "Таны энергийг үргэлж шавхдаг нэгэн дадлыг өөрчлөх боломж бий. Өдөр бүр нэг жижиг өөрчлөлт хийхээс эхлээрэй.",
  ],
  8: [
    "Шинэ газар бус, шинэ өнцгөөс харах нь ч аялал байж болно. Өдөр тутмын хэвшлээ бага зэрэг өөрчлөөд үзээрэй.",
    "Төлөвлөөгүй нэгэн уулзалт эсвэл санал таны замыг сонирхолтой болгож мэднэ. Боломжийг нээлттэй хүлээж аваарай.",
  ],
  9: [
    "Хүмүүсийн амархан анзаарахгүй нэгэн давуу тал танд бий. Өөртөө энгийн санагддаг зүйлээ бусдаас асууж үзээрэй.",
    "Таны авьяас бүтээлч сэтгэлгээ эсвэл тэвчээртэй холбоотой байж мэднэ. Туршилт хийж, өөрийгөө шинэ орчинд сорьж үзээрэй.",
  ],
  10: [
    "Таны бодлыг өөрчилж мэдэх яриа ойртож байна. Шинэ хүнтэй уулзахдаа урьдчилан дүгнэхгүй сонсоорой.",
    "Хуучин танилтайгаа дахин холбогдох шалтгаан гарч магадгүй. Энэ удаад юу өөр болсныг ажиглаарай.",
  ],
  11: [
    "Таныг өөрчлөх зүйл том үйл явдал биш, жижиг шийдвэрүүдийн нийлбэр байж болно. Өнөөдрийн сонголтоо анзаарч эхлээрэй.",
    "Зоригтой алхам хийх боломж ойртож байгаа ч бэлтгэл чухал. Айдсаа үгүйсгэхийн оронд мэдээлэл цуглуулж, төлөвлөгөө гаргаарай.",
  ],
  12: [
    "Хүсэл мөрөөдөлд тань тууштай байдал хамгийн их нөлөөлнө. Хийж чадах хамгийн жижиг алхмаа сонгоод давтаарай.",
    "Таны хүсэл биелэх замд зөв хүмүүсийн дэмжлэг хэрэг болж мэднэ. Тусламж хүсэхээс бүү санаа зовоорой.",
  ],
};

type RevealedCard = {
  card: Card;
  answer: string;
};

function shuffle<T>(items: T[]): T[] {
  const result = [...items];

  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }

  return result;
}

const hiddenSymbols = ["☾", "✦", "☼"];

export default function Home() {
  const [cards, setCards] = useState<Card[]>(initialCards);

  const [openedAnswers, setOpenedAnswers] = useState<Record<number, string>>(
    {},
  );

  const [pickerCard, setPickerCard] = useState<Card | null>(null);
  const [drawOptions, setDrawOptions] = useState<string[]>([]);

  const [revealingIndex, setRevealingIndex] = useState<number | null>(null);

  const [selectedCard, setSelectedCard] = useState<RevealedCard | null>(null);

  const [paymentCard, setPaymentCard] = useState<RevealedCard | null>(null);

  const [flippingId, setFlippingId] = useState<number | null>(null);

  const selectingRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const openedCount = Object.keys(openedAnswers).length;

  useEffect(() => {
    setCards((current) => shuffle(current));

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }

      document.body.style.cursor = "default";
    };
  }, []);

  function chooseTopic(card: Card) {
    if (selectingRef.current || pickerCard || selectedCard || paymentCard) {
      return;
    }

    // Нээсэн сэдвийн хариултыг дахин үзэх
    if (openedAnswers[card.id]) {
      setSelectedCard({
        card,
        answer: openedAnswers[card.id],
      });
      return;
    }

    selectingRef.current = true;
    setFlippingId(card.id);

    // 3 өөр хариултыг санамсаргүй дарааллаар байрлуулах
    setDrawOptions(shuffle([card.answer, ...extraAnswers[card.id]]));

    timerRef.current = setTimeout(() => {
      setFlippingId(null);
      setPickerCard(card);
      selectingRef.current = false;
    }, 650);
  }

  function chooseHiddenCard(index: number) {
    if (!pickerCard || revealingIndex !== null || selectingRef.current) {
      return;
    }

    const card = pickerCard;
    const answer = drawOptions[index] ?? card.answer;

    selectingRef.current = true;
    setRevealingIndex(index);

    timerRef.current = setTimeout(() => {
      setPickerCard(null);
      setRevealingIndex(null);
      selectingRef.current = false;

      if (Object.keys(openedAnswers).length === 0) {
        // Эхний карт үнэгүй
        setOpenedAnswers((current) => ({
          ...current,
          [card.id]: answer,
        }));

        setSelectedCard({ card, answer });
      } else {
        // Бусад карт QPay холбогдох хүртэл түгжээтэй
        setPaymentCard({ card, answer });
      }
    }, 550);
  }

  function closeModal() {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    selectingRef.current = false;

    setPickerCard(null);
    setRevealingIndex(null);
    setSelectedCard(null);
    setPaymentCard(null);
    setFlippingId(null);

    document.body.style.cursor = "default";
  }

  return (
    <main
      id="home"
      className="min-h-screen overflow-hidden bg-[#0a0812] text-[#f4ead8]"
    >
      {/* HEADER */}
      <header className="mx-auto flex max-w-7xl items-center justify-between px-4 py-5 sm:px-6 sm:py-7">
        <a href="#home" className="min-w-0">
          <div className="text-[15px] font-semibold tracking-[0.23em] text-[#d9bd83] sm:text-xl sm:tracking-[0.3em]">
            TENGER ATLS
          </div>

          <div className="mt-1 text-[8px] tracking-[0.3em] text-[#887b99] sm:text-[9px]">
            THE MYSTERY WITHIN
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

      {/* 12 СЭДЭВ */}
      <section
        id="cards"
        className="mx-auto max-w-7xl px-3 pb-12 sm:px-5 sm:pb-20"
      >
        <div className="mx-auto mb-3 flex max-w-6xl items-center justify-between gap-3 px-2 sm:mb-6">
          <p className="text-[10px] tracking-[0.16em] text-[#9c8aa7] sm:text-xs sm:tracking-[0.25em]">
            12 НУУЦ СЭДЭВ
          </p>

          <p className="text-right text-[11px] text-[#b49a6f] sm:text-xs">
            {openedCount === 0
              ? "Эхний карт үнэгүй"
              : "Дараагийн карт · 3,000₮"}
          </p>
        </div>

        <OracleScene
          cards={cards}
          flippingId={flippingId}
          onSelect={(id) => {
            const card = cards.find((item) => item.id === id);

            if (card) {
              chooseTopic(card);
            }
          }}
        />

        <div className="mt-7 text-center sm:mt-12">
          <div className="mb-3 text-xl text-[#c5a36e]">✧</div>

          <p className="text-[10px] tracking-[0.18em] text-[#95849f] sm:text-xs sm:tracking-[0.25em]">
            ЗӨН СОВИНГОО ДАГААРАЙ
          </p>
        </div>
      </section>

      {/* FOOTER */}
      <footer
        id="about"
        className="border-t border-[#8e754c]/20 px-6 py-8 text-center"
      >
        <p className="text-xs tracking-[0.3em] text-[#9d8969]">TENGER ATLS</p>

        <p className="mt-3 text-[10px] text-[#71657d]">
          Өөрийгөө таних аялал эндээс эхэлнэ.
        </p>
      </footer>

      {/* 3 НУУЦ КАРТ СОНГОХ ЦОНХ */}
      {pickerCard && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-[#05040b]/90 px-4 py-6 backdrop-blur-xl">
          <div className="flex min-h-full items-center justify-center">
            <div className="relative w-full max-w-xl rounded-2xl border border-[#b69561]/35 bg-[radial-gradient(ellipse_at_top,#241b23_0%,#100c16_75%)] px-4 py-8 text-center shadow-2xl sm:px-9 sm:py-11">
              <button
                type="button"
                onClick={closeModal}
                aria-label="Хаах"
                className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full border border-[#b69561]/30 text-xl text-[#cab68d] hover:bg-white/10"
              >
                ×
              </button>

              <div className="mb-3 text-xl text-[#c6a570]">✧</div>

              <p className="text-[10px] uppercase tracking-[0.24em] text-[#a9947b] sm:text-xs">
                {pickerCard.title}
              </p>

              <h2 className="mx-auto mt-3 max-w-md text-xl font-light leading-8 text-[#f0e0c4] sm:text-2xl">
                3 нууц картаас нэгийг сонго
              </h2>

              <p className="mt-3 text-xs leading-6 text-[#a99eab] sm:text-sm">
                Бүх картын ард өөр өөр хариулт нуугдаж байна.
              </p>

              <div className="mx-auto mt-8 grid max-w-[475px] grid-cols-3 gap-2.5 sm:gap-5">
                {hiddenSymbols.map((symbol, index) => (
                  <button
                    key={index}
                    type="button"
                    aria-label={`Нууц карт ${index + 1} сонгох`}
                    disabled={revealingIndex !== null}
                    onClick={() => chooseHiddenCard(index)}
                    className={`group relative aspect-[2/3] w-full touch-manipulation overflow-hidden rounded-lg border border-[#bc9962]/80 bg-[radial-gradient(ellipse_at_50%_40%,#37271f_0%,#1a1214_57%,#0c0a0f_100%)] shadow-[0_14px_38px_rgba(0,0,0,0.5)] transition-transform duration-500 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#d5b57e] ${
                      revealingIndex === index
                        ? "-translate-y-3 scale-[1.08] ring-2 ring-[#e0be7b]/60"
                        : "hover:-translate-y-2 hover:shadow-[0_22px_42px_rgba(195,153,90,0.14)] active:-translate-y-1"
                    }`}
                  >
                    <span className="pointer-events-none absolute inset-[5px] rounded-[5px] border border-[#c6a46e]/70 sm:inset-[8px]" />

                    <span className="pointer-events-none absolute inset-[10px] rounded-[3px] border border-[#8e7248]/50 sm:inset-[15px]" />

                    <span className="pointer-events-none absolute left-1/2 top-1/2 flex aspect-square w-[68%] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-[#b99a65]/70">
                      <span className="flex h-[78%] w-[78%] items-center justify-center rounded-full border border-[#856b46]/70 text-[clamp(26px,8vw,52px)] font-light text-[#dfc18a] sm:text-6xl">
                        {symbol}
                      </span>
                    </span>

                    <span className="pointer-events-none absolute left-[13%] top-[9%] h-1 w-1 rotate-45 bg-[#d5b57e]" />
                    <span className="pointer-events-none absolute right-[13%] top-[9%] h-1 w-1 rotate-45 bg-[#d5b57e]" />
                    <span className="pointer-events-none absolute bottom-[9%] left-[13%] h-1 w-1 rotate-45 bg-[#d5b57e]" />
                    <span className="pointer-events-none absolute bottom-[9%] right-[13%] h-1 w-1 rotate-45 bg-[#d5b57e]" />
                  </button>
                ))}
              </div>

              <p className="mt-7 text-[10px] tracking-[0.16em] text-[#a48e75] sm:text-xs">
                КАРТЫН НҮҮРЭН ДЭЭР ДАРЖ СОНГООРОЙ
              </p>
            </div>
          </div>
        </div>
      )}

      {/* СОНГОСОН КАРТЫН ХАРИУЛТ */}
      {selectedCard && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-[#05040b]/90 px-4 py-6 backdrop-blur-xl">
          <div className="flex min-h-full items-center justify-center">
            <div className="relative w-full max-w-lg rounded-2xl border border-[#c6a46e]/45 bg-[radial-gradient(ellipse_at_top,#291e2b_0%,#150f1f_78%)] px-6 py-9 text-center shadow-2xl sm:p-12">
              <button
                type="button"
                onClick={closeModal}
                aria-label="Хаах"
                className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full border border-[#b69561]/30 text-xl text-[#cab68d] hover:bg-white/10"
              >
                ×
              </button>

              <div className="mb-5 text-4xl text-[#d7b77b]">
                {selectedCard.card.symbol}
              </div>

              <p className="mb-4 text-[10px] tracking-[0.3em] text-[#bda170] sm:text-xs">
                ТАНЫ ХАРИУЛТ
              </p>

              <h2 className="text-2xl font-light text-[#e8d5b3] sm:text-3xl">
                {selectedCard.card.title}
              </h2>

              <div className="mx-auto my-6 h-px w-20 bg-[#b99763]" />

              <h3 className="text-[15px] leading-7 text-[#f0e4d0] sm:text-base sm:leading-8">
                {selectedCard.card.question}
              </h3>

              <p className="mt-6 text-sm leading-7 text-[#c6b8ca] sm:leading-8">
                {selectedCard.answer}
              </p>

              <button
                type="button"
                onClick={closeModal}
                className="mt-9 w-full rounded-full border border-[#c3a16e]/70 px-6 py-3 text-xs tracking-[0.15em] text-[#dfc48e] transition hover:bg-[#c3a16e] hover:text-[#160f20] sm:w-auto sm:px-9"
              >
                БУСАД КАРТ РУУ БУЦАХ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* QPAY ТӨЛБӨРИЙН ЦОНХ */}
      {paymentCard && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-[#05040b]/90 px-4 py-6 backdrop-blur-xl">
          <div className="flex min-h-full items-center justify-center">
            <div className="relative w-full max-w-sm rounded-2xl border border-[#c6a46e]/50 bg-[#160f20] p-7 text-center sm:p-9">
              <button
                type="button"
                onClick={closeModal}
                aria-label="Хаах"
                className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full border border-[#b69561]/30 text-xl text-[#cab68d] hover:bg-white/10"
              >
                ×
              </button>

              <div className="mb-5 text-4xl text-[#d7b77b]">
                {paymentCard.card.symbol}
              </div>

              <p className="text-xs tracking-[0.3em] text-[#bda170]">
                НУУЦЫГ ТАЙЛАХ
              </p>

              <h2 className="mt-4 text-xl text-[#e8d5b3]">
                {paymentCard.card.title}
              </h2>

              <p className="mt-4 text-sm leading-7 text-[#b9aabd]">
                Сонгосон картынхаа хариултыг нээхийн тулд төлбөрөө төлнө үү.
              </p>

              <div className="my-7 text-3xl font-light text-[#e2c28a]">
                3,000₮
              </div>

              <p className="mb-6 text-xs leading-6 text-[#a396a9]">
                QPay хараахан холбогдоогүй тул одоогоор бодит төлбөр авахгүй.
              </p>

              <button
                type="button"
                disabled
                className="w-full cursor-not-allowed rounded-full bg-[#786342]/40 py-3 text-xs tracking-widest text-[#b5a080]"
              >
                QPAY УДАХГҮЙ
              </button>

              <button
                type="button"
                onClick={closeModal}
                className="mt-5 text-xs text-[#a899ae] hover:text-white"
              >
                Буцах
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
