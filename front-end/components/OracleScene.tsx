"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useLoader, useThree } from "@react-three/fiber";
import * as THREE from "three";

type SceneCard = {
  id: number;
  symbol: string;
  title: string;
  cover?: string;
};

type OracleSceneProps = {
  cards: SceneCard[];
  onSelect: (id: number) => void;
  flippingId: number | null;
};

function createBackTexture() {
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
  ctx.fillText("✧", 256, 392);

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
  ctx.fillText("THE ORACLE", 256, 677);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;

  return texture;
}

function CardFront({ card }: { card: SceneCard }) {
  const imageTexture = card.cover
    ? useLoader(THREE.TextureLoader, card.cover)
    : null;

  const fallbackTexture = useMemo(
    () =>
      !card.cover ? createFallbackFrontTexture(card.symbol, card.title) : null,
    [card.cover, card.symbol, card.title],
  );

  useEffect(() => {
    if (imageTexture) {
      imageTexture.colorSpace = THREE.SRGBColorSpace;
      imageTexture.anisotropy = 4;
    }

    return () => {
      fallbackTexture?.dispose();
    };
  }, [imageTexture, fallbackTexture]);

  const map = imageTexture ?? fallbackTexture ?? undefined;

  return (
    <mesh position={[0, 0, 0.057]}>
      <planeGeometry args={[1.4, 2.1]} />
      <meshBasicMaterial map={map} toneMapped={false} />
    </mesh>
  );
}

function OracleCard({
  card,
  index,
  position,
  active,
  baseScale,
  onSelect,
}: {
  card: SceneCard;
  index: number;
  position: [number, number, number];
  active: boolean;
  baseScale: number;
  onSelect: () => void;
}) {
  const group = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);

  const target = useRef(new THREE.Vector3(...position));
  const targetScale = useRef(new THREE.Vector3());

  const home = useMemo(
    () => new THREE.Vector3(...position),
    [position[0], position[1], position[2]],
  );

  const backTexture = useMemo(() => createBackTexture(), []);

  useEffect(() => {
    return () => {
      backTexture.dispose();
    };
  }, [backTexture]);

  useFrame((state, delta) => {
    if (!group.current) return;

    const t = state.clock.elapsedTime;
    const speed = 1 - Math.exp(-delta * 5);

    target.current.set(
      active ? 0 : home.x,
      active ? 0 : home.y + Math.sin(t * 0.45 + index * 0.8) * 0.025,
      active ? 1.8 : home.z,
    );

    group.current.position.lerp(target.current, speed);

    const scale = active
      ? baseScale * 1.3
      : hovered
        ? baseScale * 1.045
        : baseScale;

    targetScale.current.setScalar(scale);
    group.current.scale.lerp(targetScale.current, speed);

    const rotationY = active
      ? Math.PI
      : hovered
        ? -0.07
        : Math.sin(t * 0.24 + index) * 0.012;

    group.current.rotation.y = THREE.MathUtils.damp(
      group.current.rotation.y,
      rotationY,
      4,
      delta,
    );
  });

  return (
    <group
      ref={group}
      position={position}
      onClick={(event) => {
        event.stopPropagation();
        setHovered(false);
        document.body.style.cursor = "default";
        onSelect();
      }}
      onPointerOver={(event) => {
        event.stopPropagation();

        if (event.pointerType === "mouse") {
          setHovered(true);
          document.body.style.cursor = "pointer";
        }
      }}
      onPointerOut={() => {
        setHovered(false);
        document.body.style.cursor = "default";
      }}
    >
      {/* card body */}
      <mesh>
        <boxGeometry args={[1.48, 2.18, 0.11]} />
        <meshStandardMaterial
          color="#14100d"
          metalness={0.35}
          roughness={0.5}
        />
      </mesh>

      {/* gold edge frame */}
      <mesh position={[0, 0, 0.02]}>
        <boxGeometry args={[1.5, 2.2, 0.02]} />
        <meshStandardMaterial
          color="#876842"
          metalness={0.55}
          roughness={0.35}
        />
      </mesh>

      {/* front */}
      <CardFront card={card} />

      {/* back */}
      <mesh position={[0, 0, -0.057]} rotation={[0, Math.PI, 0]}>
        <planeGeometry args={[1.4, 2.1]} />
        <meshBasicMaterial map={backTexture} toneMapped={false} />
      </mesh>

      {hovered && (
        <pointLight
          position={[0, 0, 0.8]}
          color="#d9be88"
          intensity={0.7}
          distance={3}
        />
      )}
    </group>
  );
}

function CameraRig() {
  const { camera, pointer, size } = useThree();

  const depth = size.width < 520 ? 15.4 : size.width < 900 ? 12.4 : 9.7;

  useEffect(() => {
    camera.position.z = depth;
    camera.lookAt(0, 0, 0);
  }, [camera, depth]);

  useFrame((_, delta) => {
    camera.position.x = THREE.MathUtils.damp(
      camera.position.x,
      pointer.x * 0.13,
      1.6,
      delta,
    );

    camera.position.y = THREE.MathUtils.damp(
      camera.position.y,
      pointer.y * 0.08,
      1.6,
      delta,
    );

    camera.lookAt(0, 0, 0);
  });

  return null;
}

function Scene({ cards, onSelect, flippingId }: OracleSceneProps) {
  const { size } = useThree();

  const mobile = size.width < 520;
  const tablet = size.width >= 520 && size.width < 900;

  const columns = mobile ? 2 : tablet ? 3 : 4;
  const rows = Math.ceil(cards.length / columns);

  const gapX = mobile ? 1.58 : tablet ? 1.95 : 2.18;
  const gapY = mobile ? 1.84 : tablet ? 2.12 : 2.32;

  const baseScale = mobile ? 0.79 : tablet ? 0.87 : 1;

  return (
    <>
      <color attach="background" args={["#0a0812"]} />
      <fog attach="fog" args={["#0a0812", 18, 32]} />

      <ambientLight intensity={0.8} />

      <directionalLight position={[-4, 6, 8]} intensity={1.6} color="#f1dfbd" />

      <pointLight
        position={[0, 0, -4]}
        intensity={7}
        color="#8b6b42"
        distance={15}
      />

      <CameraRig />

      {cards.map((card, index) => {
        const col = index % columns;
        const row = Math.floor(index / columns);

        const position: [number, number, number] = [
          (col - (columns - 1) / 2) * gapX,
          ((rows - 1) / 2 - row) * gapY,
          0,
        ];

        return (
          <OracleCard
            key={card.id}
            card={card}
            index={index}
            position={position}
            active={flippingId === card.id}
            baseScale={baseScale}
            onSelect={() => onSelect(card.id)}
          />
        );
      })}
    </>
  );
}

export default function OracleScene(props: OracleSceneProps) {
  return (
    <div className="relative h-[1030px] w-full overflow-hidden bg-[#0a0812] sm:h-[900px] lg:h-[780px]">
      <div className="pointer-events-none absolute inset-0 z-10 bg-[radial-gradient(ellipse_at_50%_45%,rgba(153,113,65,0.09)_0%,transparent_55%,rgba(10,8,18,0.25)_100%)]" />

      <Suspense
        fallback={
          <div className="flex h-full items-center justify-center text-xs tracking-[0.35em] text-[#b99a65]">
            TENGER ATLS
          </div>
        }
      >
        <Canvas
          camera={{
            position: [0, 0, 15.4],
            fov: 42,
          }}
          dpr={[1, 1.35]}
          gl={{
            antialias: true,
            alpha: false,
            powerPreference: "high-performance",
          }}
        >
          <Scene {...props} />
        </Canvas>
      </Suspense>

      <div className="pointer-events-none absolute bottom-2 left-0 right-0 z-20 text-center text-[9px] tracking-[0.3em] text-[#9c8156] sm:bottom-4">
        CHOOSE YOUR DESTINY
      </div>
    </div>
  );
}
