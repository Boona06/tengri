"use client";
import { useState } from "react";

export default function TarotFace({ image, symbol, title, back = false }: {
  image?: string | null; symbol?: string | null; title: string; back?: boolean;
}) {
  const [failed, setFailed] = useState<string | null>(null);
  return <span className={`tarot-face ${back ? "tarot-reverse" : ""}`}>
    {image && failed !== image ? (
      // Admin-managed URLs may be remote; preserve native image loading and error fallback.
      // eslint-disable-next-line @next/next/no-img-element
      <img src={image} alt="" draggable={false} onError={() => setFailed(image)} />
    ) : <>
      <span className="tarot-orbit" aria-hidden="true">{symbol || title.slice(0, 1)}</span>
      <span className="tarot-caption">{back ? "НУУЦ ХАРИУЛТ" : title}</span>
    </>}
    <span className="tarot-border" aria-hidden="true" />
  </span>;
}
