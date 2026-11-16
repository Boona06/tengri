"use client";

import { Component, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { cardLayout, FLIP_DURATION_MS, type Card } from "../lib/cards";
import { useReducedMotion } from "../lib/use-reduced-motion";
import TarotFace from "./TarotFace";

type SceneCard = Pick<Card, "id" | "symbol" | "title" | "cover" | "backCover">;
type OracleSceneProps = {
  cards: SceneCard[];
  onSelect: (id: string) => void;
  flippingId: string | null;
  disabled?: boolean;
  paused?: boolean;
};

function createBackTexture(symbol: string, title: string) {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 768;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D context unavailable");

  const gradient = ctx.createRadialGradient(256, 360, 40, 256, 360, 520);
  gradient.addColorStop(0, "#221812");
  gradient.addColorStop(0.7, "#100c0a");
  gradient.addColorStop(1, "#060507");

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 512, 768);

  // outer borders
  ctx.strokeStyle = "#c9a86d";
  ctx.lineWidth = 3;
  ctx.strokeRect(18, 18, 476, 732);

  ctx.strokeStyle = "#7b613c";
  ctx.lineWidth = 1.4;
  ctx.strokeRect(30, 30, 452, 708);

  // corners
  ctx.fillStyle = "#d1b277";
  for (const [x, y] of [
    [42, 42],
    [470, 42],
    [42, 726],
    [470, 726],
  ]) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(Math.PI / 4);
    ctx.fillRect(-6, -6, 12, 12);
    ctx.restore();
  }

  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  ctx.strokeStyle = "#c6a56e";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(256, 385, 142, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = "#715534";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(256, 385, 160, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = "#e7ca90";
  ctx.font = "130px Georgia, serif";
  ctx.fillText(symbol || title.slice(0, 1), 256, 392);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;

  return texture;
}

function createFallbackFrontTexture(symbol: string, title: string) {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 768;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D context unavailable");

  const gradient = ctx.createRadialGradient(256, 352, 25, 256, 352, 520);
  gradient.addColorStop(0, "#2d2119");
  gradient.addColorStop(0.72, "#18110e");
  gradient.addColorStop(1, "#090807");

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 512, 768);

  ctx.strokeStyle = "#c2a16d";
  ctx.lineWidth = 3;
  ctx.strokeRect(19, 19, 474, 730);

  ctx.strokeStyle = "#725736";
  ctx.lineWidth = 1.5;
  ctx.strokeRect(32, 32, 448, 704);

  for (const [x, y] of [
    [42, 42],
    [470, 42],
    [42, 726],
    [470, 726],
  ]) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(Math.PI / 4);
    ctx.fillStyle = "#c8a66b";
    ctx.fillRect(-7, -7, 14, 14);
    ctx.restore();
  }

  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  ctx.fillStyle = "#b59a68";
  ctx.font = "22px Georgia, serif";
  ctx.fillText("TENGER ATLS", 256, 90);

  ctx.strokeStyle = "#b99a65";
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(256, 346, 145, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = "#745a39";
  ctx.beginPath();
  ctx.arc(256, 346, 125, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = "#e4c78e";
  ctx.font = "154px Georgia, serif";
  ctx.fillText(symbol || "✧", 256, 360);

  ctx.fillStyle = "#9e8355";
  ctx.fillRect(187, 554, 138, 2);

  ctx.fillStyle = "#ead8b6";
  ctx.font = "bold 42px Arial, sans-serif";
  ctx.fillText(title, 256, 618, 400);

  ctx.fillStyle = "#99815a";
  ctx.font = "19px Georgia, serif";
  ctx.fillText("ЗӨН СОВИНГОО ДАГААРАЙ", 256, 677);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;

  return texture;
}


function CardFace({ image, symbol, title, back = false }: {
  image?: string; symbol: string; title: string; back?: boolean;
}) {
  const [loaded, setLoaded] = useState<{ url: string; texture: THREE.Texture } | null>(null);
  const fallback = useMemo(() => back ? createBackTexture(symbol, title) : createFallbackFrontTexture(symbol, title), [back, symbol, title]);
  useEffect(() => () => fallback.dispose(), [fallback]);
  useEffect(() => {
    if (!image) return;
    let active = true;
    const texture = new THREE.TextureLoader().load(image, value => {
      if (!active) return;
      value.colorSpace = THREE.SRGBColorSpace;
      value.anisotropy = 4;
      setLoaded({ url: image, texture: value });
    }, undefined, () => { /* Keep the readable generated cover if the URL fails. */ });
    return () => { active = false; texture.dispose(); };
  }, [image]);
  return <mesh position={[0, 0, back ? -0.057 : 0.057]} rotation={[0, back ? Math.PI : 0, 0]}>
    <planeGeometry args={[1.4, 2.1]} />
    <meshBasicMaterial map={loaded && loaded.url === image ? loaded.texture : fallback} toneMapped={false} />
  </mesh>;
}

function OracleCard({ card, index, position, active, hovered, reduced }: {
  card: SceneCard; index: number; position: [number, number, number]; active: boolean; hovered: boolean; reduced: boolean;
}) {
  const group = useRef<THREE.Group>(null);
  const progress = useRef(0);
  const targetScale = useRef(new THREE.Vector3(1, 1, 1));
  const wasActive = useRef(false);
  useFrame((state, delta) => {
    const mesh = group.current;
    if (!mesh) return;
    if (active !== wasActive.current) { progress.current = 0; wasActive.current = active; }
    if (active) progress.current = Math.min(1, progress.current + delta / ((FLIP_DURATION_MS - 100) / 1000));
    const t = reduced ? 1 : progress.current;
    const ease = t * t * (3 - 2 * t);
    const speed = reduced ? 1 : 1 - Math.exp(-Math.min(delta, 0.05) * 10);
    const float = reduced || active ? 0 : Math.sin(state.clock.elapsedTime * 0.45 + index) * 0.025;
    mesh.position.set(position[0], position[1] + float, active ? 1 : 0);
    const scale = active ? 1 + Math.sin(ease * Math.PI) * 0.12 : hovered && !reduced ? 1.04 : 1;
    targetScale.current.setScalar(scale);
    mesh.scale.lerp(targetScale.current, speed);
    mesh.rotation.y = active ? Math.PI * ease : reduced ? 0 : THREE.MathUtils.damp(mesh.rotation.y, hovered ? -0.07 : 0, 10, delta);
  });
  return <group ref={group} position={position}>
    <mesh><boxGeometry args={[1.48, 2.18, 0.11]} /><meshStandardMaterial color="#14100d" metalness={0.35} roughness={0.5} /></mesh>
    <mesh position={[0, 0, 0.02]}><boxGeometry args={[1.5, 2.2, 0.02]} /><meshStandardMaterial color="#876842" metalness={0.55} roughness={0.35} /></mesh>
    <CardFace image={card.cover} symbol={card.symbol} title={card.title} />
    <CardFace image={card.backCover} symbol={card.symbol} title={card.title} back />
  </group>;
}

class SceneBoundary extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? this.props.fallback : this.props.children; }
}
function supportsWebGL() {
  try {
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("webgl2");
    if (!context) return false;
    context.getExtension("WEBGL_lose_context")?.loseContext();
    return true;
  } catch { return false; }
}

export default function OracleScene({ cards, onSelect, flippingId, disabled = false, paused = false }: OracleSceneProps) {
  const wrapper = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [webgl, setWebgl] = useState(supportsWebGL);
  const [hovered, setHovered] = useState<string | null>(null);
  const reduced = useReducedMotion();
  useEffect(() => {
    const element = wrapper.current;
    if (!element) return;
    const observer = new ResizeObserver(entries => setWidth(entries[0].contentRect.width));
    const lost = (event: Event) => { event.preventDefault(); setWebgl(false); };
    // Capture on the DOM owner, even if context is lost before the R3F tree mounts.
    element.addEventListener("webglcontextlost", lost, true);
    observer.observe(element);
    return () => { observer.disconnect(); element.removeEventListener("webglcontextlost", lost, true); };
  }, []);
  const layout = useMemo(() => cardLayout(cards.length, width || 320), [cards.length, width]);
  function buttons(fallback: boolean) {
    return <div className="absolute inset-0" role="group" aria-label="Зөгнөлт картууд">
      {cards.map((card, index) => <button key={card.id} type="button" aria-label={card.title + " — карт сонгох"}
        aria-busy={flippingId === card.id} disabled={disabled} onClick={() => onSelect(card.id)}
        onPointerEnter={() => setHovered(card.id)} onPointerLeave={() => setHovered(null)}
        onFocus={() => setHovered(card.id)} onBlur={() => setHovered(null)}
        className={"oracle-hit-target " + (fallback ? "oracle-flat-card" : "") + (flippingId === card.id ? " is-flipping" : "")}
        style={{ left: layout.slots[index].left, top: layout.slots[index].top, width: layout.cardWidth, height: layout.cardHeight }}>
        {fallback ? <><span className="flat-flip"><span className="flat-front"><TarotFace image={card.cover} symbol={card.symbol} title={card.title} /></span><span className="flat-back"><TarotFace image={card.backCover} symbol={card.symbol} title={card.title} back /></span></span></> : <span className="sr-only">{card.title}</span>}
      </button>)}
    </div>;
  }
  const fallback = <>{buttons(true)}<p role="status" className="absolute bottom-0 w-full text-center text-xs text-[#bca582]">Картуудыг хөнгөн горимоор үзүүлж байна.</p></>;
  return <div ref={wrapper} className="relative mx-auto w-full max-w-5xl" style={{ height: layout.height }} data-testid="oracle-scene" data-reduced-motion={reduced}>
    {width > 0 ? webgl ? <SceneBoundary fallback={fallback}>
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <Canvas orthographic camera={{ position: [0, 0, 20], zoom: layout.zoom, near: 0.1, far: 100 }}
          dpr={[1, 1.35]} frameloop={reduced || paused ? "demand" : "always"}
          gl={{ antialias: true, alpha: true, powerPreference: "default" }} fallback={fallback}>
          <ambientLight intensity={0.8} />
          <directionalLight position={[-4, 6, 8]} intensity={1.6} color="#f1dfbd" />
          {cards.map((card, index) => <OracleCard key={card.id} card={card} index={index} position={layout.slots[index].position}
            active={flippingId === card.id} hovered={hovered === card.id} reduced={reduced} />)}
        </Canvas>
      </div>
      {buttons(false)}
    </SceneBoundary> : fallback : <p role="status" className="py-16 text-center text-[#bca582]">Картуудыг бэлтгэж байна…</p>}
  </div>;
}
