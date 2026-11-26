"use client";

import { useId, useState } from "react";

export default function ReadableText({ text, className = "" }: { text: string; className?: string }) {
  const [expanded, setExpanded] = useState(false);
  const id = useId();
  const sentences = Array.from(new Intl.Segmenter("mn", { granularity: "sentence" }).segment(text));
  const preview = sentences.slice(0, 3).map((s) => s.segment).join("").trimEnd();
  const long = sentences.length > 3 || text.length > 240;
  return (
    <div className={`readable-text ${className}`}>
      <p id={id} className={expanded ? "is-expanded" : "is-collapsed"}>
        <span className="readable-full">{text}</span>
        <span className="readable-preview">{expanded ? text : preview}{!expanded && sentences.length > 3 ? " …" : ""}</span>
      </p>
      {long && <button type="button" className="readable-toggle" aria-expanded={expanded} aria-controls={id} onClick={() => setExpanded(!expanded)}>
        {expanded ? "Хураах ↑" : "Дэлгэрэнгүй ↓"}
      </button>}
    </div>
  );
}
