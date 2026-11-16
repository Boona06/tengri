export const CARD_LIMIT = 12;
export const FLIP_DURATION_MS = 700;

export type Visual = {
  visualType: "IMAGE" | "ICON";
  imageUrl: string | null;
  backImageUrl?: string | null;
  iconName: string | null;
};
export type Answer = Visual & { id: string; text?: string };
export type Card = {
  id: string;
  type: "TOPIC" | "QUESTION";
  symbol: string;
  title: string;
  question: string;
  cover?: string;
  backCover?: string;
  answers: Answer[];
};

export function shuffle<T>(items: T[]): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Картын мэдээллийн бүтэц буруу байна.");
  return value as Record<string, unknown>;
}
function requiredText(value: unknown): string {
  if (typeof value !== "string" || !value.trim()) throw new Error("Картын мэдээлэл дутуу байна.");
  return value;
}
export function imagePath(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) return null;
  if (/^\/(?!\/|\\)/.test(value) && !value.includes("\\")) return value;
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol) ? value : null;
  } catch { return null; }
}
export function parseAnswer(value: unknown, revealed = false): Answer {
  const item = record(value);
  if (item.visualType !== "IMAGE" && item.visualType !== "ICON") throw new Error("Картын дүрс буруу байна.");
  return {
    id: requiredText(item.id), visualType: item.visualType,
    imageUrl: imagePath(item.imageUrl), backImageUrl: imagePath(item.backImageUrl),
    iconName: typeof item.iconName === "string" ? item.iconName : null,
    ...(revealed ? { text: requiredText(item.text) } : {}),
  };
}
export function parseCards(value: unknown): Card[] {
  if (!Array.isArray(value)) throw new Error("Картын жагсаалт буруу байна.");
  const cards = value.slice(0, CARD_LIMIT).map((raw): Card => {
    const item = record(raw);
    if (!Array.isArray(item.answers) || item.answers.length !== 3) throw new Error("Сэдэв бүр гурван хариулттай байх ёстой.");
    if (item.type !== "TOPIC" && item.type !== "QUESTION") throw new Error("Контентийн төрөл буруу байна.");
    const visual = parseAnswer(item);
    const answers = item.answers.map(answer => parseAnswer(answer));
    if (new Set(answers.map(answer => answer.id)).size !== 3) throw new Error("Хариултын мэдээлэл давхардсан байна.");
    return {
      id: visual.id, type: item.type, title: requiredText(item.title),
      question: typeof item.question === "string" ? item.question : "",
      symbol: visual.iconName || "", cover: visual.visualType === "IMAGE" ? visual.imageUrl || undefined : undefined,
      backCover: visual.backImageUrl || undefined, answers,
    };
  });
  if (new Set(cards.map(card => card.id)).size !== cards.length) throw new Error("Картын мэдээлэл давхардсан байна.");
  return cards;
}

// Shared by the canvas and accessible DOM hit targets: no Html portal/unmount coupling.
export function cardLayout(count: number, width: number) {
  const columns = Math.min(count || 1, width < 600 ? 2 : width < 900 ? 3 : 4);
  const gap = width < 600 ? 20 : 32;
  const cardWidth = Math.max(80, Math.min(180, (width - 32 - gap * (columns - 1)) / columns));
  const cardHeight = cardWidth * 1.5;
  const rows = Math.ceil(count / columns);
  const height = Math.max(260, rows * (cardHeight + gap) - gap + 64);
  const zoom = cardWidth / 1.4;
  return { height, cardWidth, cardHeight, zoom, slots: Array.from({ length: count }, (_, index) => {
    const row = Math.floor(index / columns);
    const rowCount = Math.min(columns, count - row * columns);
    const x = ((index % columns) - (rowCount - 1) / 2) * (cardWidth + gap);
    const y = ((rows - 1) / 2 - row) * (cardHeight + gap);
    return { left: width / 2 + x - cardWidth / 2, top: height / 2 - y - cardHeight / 2,
      position: [x / zoom, y / zoom, 0] as [number, number, number] };
  }) };
}
