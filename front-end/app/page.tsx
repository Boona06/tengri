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
  },
  {
    id: 4,
    symbol: "♛",
    title: "Хаан",
    question: "Таны ажил, карьерын дараагийн алхам юу байх вэ?",
    answer:
      "Таны ур чадвар, тууштай байдал үр дүнгээ өгөх үе ойртож байна. Өөрийн үнэ цэнийг мэдэрч, боломжийг зоригтой ашиглаарай.",
  },
  {
    id: 5,
    symbol: "✧",
    title: "Од",
    question: "Таны ирээдүйн хамгийн гэгээлэг боломж юу вэ?",
    answer:
      "Таны өмнө итгэл найдвар төрүүлэх үйл явдал гарч ирнэ. Жижиг мэт санагдах боломжийг анзаараарай.",
  },
  {
    id: 6,
    symbol: "♧",
    title: "Аз",
    question: "Мөнгө санхүүгийн тал дээр ямар өөрчлөлт ирэх вэ?",
    answer:
      "Санхүүгийн байдал тань илүү цэгцтэй болох боломжтой. Орлогоо нэмэгдүүлэхийн зэрэгцээ зарлагаа ухаалгаар төлөвлөөрэй.",
  },
  {
    id: 7,
    symbol: "♧",
    title: "Мод",
    question: "Таны амьдралд юуг орхих цаг болсон бэ?",
    answer:
      "Танд цаашид хэрэггүй болсон хуучин бодол, дадал бий. Тэдгээрээс салж чадвал шинэ боломжид зай гарна.",
  },
  {
    id: 8,
    symbol: "♜",
    title: "Зам",
    question: "Таныг ямар шинэ аялал, өөрчлөлт хүлээж байна вэ?",
    answer:
      "Таны хэвшсэн орчноос өөр шинэ зүйлтэй танилцах боломж гарч мэднэ. Өөрчлөлтөөс бүү ай.",
  },
  {
    id: 9,
    symbol: "♢",
    title: "Эрдэнэ",
    question: "Таны хамгийн том авьяас юу вэ?",
    answer:
      "Таны өөрөө анзаараагүй нэгэн чадвар бий. Түүнийгээ хөгжүүлэхэд цаг гаргавал шинэ үр дүнг мэдрэх болно.",
  },
  {
    id: 10,
    symbol: "∞",
    title: "Хувь",
    question: "Таны амьдралд ямар чухал уулзалт тохиох бол?",
    answer:
      "Шинэ танил эсвэл хуучин холбоо дахин сэргэх боломж байна. Хүмүүстэй харилцахдаа нээлттэй байгаарай.",
  },
  {
    id: 11,
    symbol: "♨",
    title: "Гал",
    question: "Таныг хамгийн их өөрчлөх зүйл юу байх вэ?",
    answer:
      "Таны зориг гарган хийсэн нэг шийдвэр амьдралын тань чиглэлийг өөрчилж мэднэ. Яаралгүй бодож, өөртөө итгээрэй.",
  },
  {
    id: 12,
    symbol: "✦",
    title: "Тэнгэр",
    question: "Таны хүсэл биелэхэд юу хамгийн их нөлөөлөх вэ?",
    answer:
      "Хүсэл мөрөөдөл тань зөвхөн хүлээлтээр биелэхгүй. Түүн рүү чиглэсэн жижиг боловч бодит алхмаа өнөөдрөөс эхлүүлээрэй.",
  },
];

function shuffleCards(cards: Card[]) {
  const shuffled = [...cards];

  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  return shuffled;
}

export default function Home() {
  const [cards, setCards] = useState(initialCards);
  const [openedIds, setOpenedIds] = useState<number[]>([]);
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);
  const [paymentCard, setPaymentCard] = useState<Card | null>(null);
  const [flippingId, setFlippingId] = useState<number | null>(null);
  const selectingRef = useRef(false);

  useEffect(() => {
    setCards((current) => shuffleCards(current));
  }, []);

  function chooseCard(card: Card) {
    if (selectingRef.current) return;

    selectingRef.current = true;
    setFlippingId(card.id);

    window.setTimeout(() => {
      if (openedIds.includes(card.id)) {
        setSelectedCard(card);
      } else if (openedIds.length === 0) {
        setOpenedIds([card.id]);
        setSelectedCard(card);
      } else {
        setPaymentCard(card);
      }

      selectingRef.current = false;
    }, 1500);
  }

  function closeCardModal() {
    setSelectedCard(null);
    setPaymentCard(null);
    setFlippingId(null);
  }

  return (
    <main className="min-h-screen overflow-hidden bg-[#0a0812] text-[#f4ead8]">
      <header className="mx-auto flex max-w-7xl items-center justify-between px-6 py-7">
        <div>
          <div className="text-xl font-semibold tracking-[0.3em] text-[#d9bd83]">
            TENGER ATLS
          </div>
          <div className="mt-1 text-[9px] tracking-[0.42em] text-[#887b99]">
            THE MYSTERY WITHIN
          </div>
        </div>

        <div className="hidden gap-8 text-xs tracking-widest text-[#b8aabb] md:flex">
          <span>НҮҮР</span>
          <span>КАРТУУД</span>
          <span>БИДНИЙ ТУХАЙ</span>
        </div>

        <div className="rounded-full border border-[#9b8055]/40 px-4 py-2 text-xs text-[#d9bd83]">
          ✧ Зөн билэг ✧
        </div>
      </header>

      <section className="relative mx-auto max-w-5xl px-6 pb-12 pt-16 text-center">
        <div className="absolute left-1/2 top-0 -z-0 h-72 w-72 -translate-x-1/2 rounded-full bg-[#683b91]/15 blur-[100px]" />

        <div className="relative">
          <div className="mb-6 text-sm tracking-[0.5em] text-[#b59b71]">
            ✧ ✧ ✧
          </div>

          <p className="mb-5 text-xs tracking-[0.45em] text-[#a896b5]">
            ТАНЫГ ХҮЛЭЭЖ БУЙ НУУЦ
          </p>

          <h1 className="text-4xl font-light leading-tight tracking-widest sm:text-6xl">
            Хариулт тань
            <br />
            <span className="mt-3 block text-[#d8bd83]">
              аль хэдийн энд бий
            </span>
          </h1>

          <p className="mx-auto mt-7 max-w-xl text-sm leading-8 text-[#a99dad]">
            Сэтгэлдээ нэгэн асуулт бодоод, доорх картуудаас зөн совингоороо
            нэгийг сонгоорой. Магадгүй таны хайж буй хариулт яг энд байж мэднэ.
          </p>

          <div className="mx-auto mt-9 h-px w-24 bg-gradient-to-r from-transparent via-[#c2a16a] to-transparent" />

          <p className="mt-5 text-xs tracking-[0.25em] text-[#c4ad85]">
            НЭГ КАРТ СОНГООРОЙ
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 pb-20">
        <div className="mb-8 flex items-center justify-between">
          <p className="text-xs tracking-[0.25em] text-[#9c8aa7]">
            THE TWELVE MYSTERIES
          </p>
          <p className="text-xs text-[#b49a6f]">
            {openedIds.length === 0
              ? "Эхний карт үнэгүй"
              : "Дараагийн карт · 3,000₮"}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-6 lg:grid-cols-4">
          <OracleScene
            cards={cards}
            flippingId={flippingId}
            onSelect={(id) => {
              const card = cards.find((item) => item.id === id);

              if (card) {
                chooseCard(card);
              }
            }}
          />
        </div>

        <div className="mt-12 text-center">
          <div className="mb-4 text-xl text-[#c5a36e]">✧</div>
          <p className="text-xs tracking-[0.25em] text-[#95849f]">
            {openedIds.length === 0
              ? "ТАНЫ ЗӨН СОВИНГОО ДАГА"
              : "ХАРИУЛТУУД ТАНЬ ТАНЫГ ХҮЛЭЭЖ БАЙНА"}
          </p>
        </div>
      </section>

      <footer className="border-t border-[#8e754c]/20 px-6 py-8 text-center">
        <p className="text-xs tracking-[0.3em] text-[#9d8969]">TENGER ATLS</p>
        <p className="mt-3 text-[10px] text-[#71657d]">
          Өөрийгөө таних аялал эндээс эхэлнэ.
        </p>
      </footer>

      {selectedCard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/85 p-5 backdrop-blur-md">
          <div className="relative my-auto w-full max-w-lg rounded-2xl border border-[#c6a46e]/50 bg-[#160f20] p-8 text-center shadow-2xl sm:p-12">
            <div className="mb-6 text-3xl text-[#d7b77b]">
              {selectedCard.symbol}
            </div>

            <p className="mb-4 text-xs tracking-[0.4em] text-[#bda170]">
              YOUR MESSAGE
            </p>

            <h2 className="text-3xl font-light tracking-widest text-[#e8d5b3]">
              {selectedCard.title}
            </h2>

            <div className="mx-auto my-7 h-px w-20 bg-[#b99763]" />

            <h3 className="text-base leading-8 text-[#f0e4d0]">
              {selectedCard.question}
            </h3>

            <p className="mt-7 text-sm leading-8 text-[#b9aabd]">
              {selectedCard.answer}
            </p>

            <button
              onClick={closeCardModal}
              className="mt-10 rounded-full border border-[#c3a16e]/70 px-9 py-3 text-xs tracking-[0.2em] text-[#dfc48e] transition hover:bg-[#c3a16e] hover:text-[#160f20]"
            >
              БУСАД КАРТ РУУ БУЦАХ
            </button>
          </div>
        </div>
      )}

      {paymentCard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-5 backdrop-blur-md">
          <div className="w-full max-w-sm rounded-2xl border border-[#c6a46e]/50 bg-[#160f20] p-8 text-center">
            <div className="mb-5 text-4xl text-[#d7b77b]">
              {paymentCard.symbol}
            </div>

            <p className="text-xs tracking-[0.3em] text-[#bda170]">
              НУУЦЫГ ТАЙЛАХ
            </p>

            <h2 className="mt-4 text-xl text-[#e8d5b3]">{paymentCard.title}</h2>

            <p className="mt-4 text-sm leading-7 text-[#b9aabd]">
              Энэ картын хариултыг уншихын тулд төлбөрөө төлнө үү.
            </p>

            <div className="my-7 text-3xl font-light text-[#e2c28a]">
              3,000₮
            </div>

            <p className="mb-6 text-xs text-[#8f809a]">
              QPay холболтыг дараагийн хөгжүүлэлтийн шатанд хийнэ. Одоогоор
              бодит төлбөр авахгүй.
            </p>

            <button
              disabled
              className="w-full cursor-not-allowed rounded-full bg-[#786342]/40 py-3 text-xs tracking-widest text-[#b5a080]"
            >
              QPAY УДАХГҮЙ
            </button>

            <button
              onClick={closeCardModal}
              className="mt-5 text-xs text-[#a899ae] hover:text-white"
            >
              Буцах
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
