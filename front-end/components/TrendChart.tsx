"use client";
import { useState } from "react";
export default function TrendChart({
  data,
  metric,
  label,
}: {
  data: { day: string; visits: number; revenue: number }[];
  metric: "visits" | "revenue";
  label: string;
}) {
  const [active, setActive] = useState<number | null>(null);
  const max = Math.max(1, ...data.map((d) => d[metric]));
  const x = (i: number) => 45 + (i / Math.max(1, data.length - 1)) * 650;
  const y = (v: number) => 190 - (v / max) * 155;
  const points = data.map((d, i) => `${x(i)},${y(d[metric])}`).join(" ");
  return (
    <div>
      {data.length === 0 ? (
        <p>Энэ хугацаанд мэдээлэл алга.</p>
      ) : (
        <>
          <svg
            viewBox="0 0 740 235"
            role="img"
            aria-label={label}
            style={{ width: "100%", height: "auto" }}
          >
            {[0, 0.25, 0.5, 0.75, 1].map((n) => (
              <g key={n}>
                <line
                  x1={45}
                  x2={700}
                  y1={y(max * n)}
                  y2={y(max * n)}
                  stroke="#eee8f5"
                />
                <text x={0} y={y(max * n) + 4} fontSize={10} fill="#84758f">
                  {Math.round(max * n).toLocaleString()}
                </text>
              </g>
            ))}
            <polygon
              points={`45,190 ${points} ${x(data.length - 1)},190`}
              fill="#8b65dc18"
            />
            <polyline
              points={points}
              fill="none"
              stroke="#8053d8"
              strokeWidth={3}
              strokeLinejoin="round"
            />
            {data.map((d, i) => (
              <g key={d.day}>
                <circle
                  cx={x(i)}
                  cy={y(d[metric])}
                  r={active === i ? 6 : 4}
                  fill="#8053d8"
                  tabIndex={0}
                  onFocus={() => setActive(i)}
                  onMouseEnter={() => setActive(i)}
                  aria-label={`${d.day}: ${d[metric]}`}
                >
                  <title>
                    {d.day}: {d[metric].toLocaleString()}
                    {metric === "revenue" ? "₮" : ""}
                  </title>
                </circle>
                {(i === 0 || i === data.length - 1) && (
                  <text
                    x={x(i)}
                    y={217}
                    fontSize={11}
                    textAnchor="middle"
                    fill="#84758f"
                  >
                    {d.day.slice(5)}
                  </text>
                )}
              </g>
            ))}
          </svg>
          <p aria-live="polite">
            {active !== null && data[active]
              ? `${data[active].day} · ${data[active][metric].toLocaleString()}${metric === "revenue" ? "₮" : " зочилсон өдөр"}`
              : "Цэг дээр очиж тухайн өдрийн үзүүлэлтийг хараарай."}
          </p>
        </>
      )}
    </div>
  );
}
