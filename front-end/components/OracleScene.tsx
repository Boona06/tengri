"use client";

import { Suspense, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
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

const GOLD = "#c8a66b";

function createCardTexture(symbol: string, title: string, isBack = false) {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 768;

  const ctx = canvas.getContext("2d")!;

  const gradient = ctx.createRadialGradient(256, 360, 30, 256, 360, 520);
  gradient.addColorStop(0, "#30251d");
  gradient.addColorStop(0.7, "#17110e");
  gradient.addColorStop(1, "#090807");

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 512, 768);

  // Давхар алтан хүрээ
  ctx.strokeStyle = "#b99a65";
  ctx.lineWidth = 3;
  ctx.strokeRect(20, 20, 472, 728);

  ctx.strokeStyle = "#705735";
  ctx.lineWidth = 1.5;
  ctx.strokeRect(32, 32, 448, 704);

  // Булангийн чимэглэл
  ctx.fillStyle = GOLD;
  [
    [42, 42],
    [470, 42],
    [42, 726],
    [470, 726],
  ].forEach(([x, y]) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(Math.PI / 4);
    ctx.fillRect(-8, -8, 16, 16);
    ctx.restore();
  });

  if (isBack) {
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    ctx.strokeStyle = "#b99a65";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(256, 384, 135, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = "#705735";
    ctx.beginPath();
    ctx.arc(256, 384, 155, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = "#e4c78e";
    ctx.font = "110px serif";
    ctx.fillText("✧", 256, 390);

    ctx.fillStyle = "#b99a65";
    ctx.font = "24px serif";
    ctx.fillText("TENGER ATLS", 256, 100);
  } else {
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    ctx.fillStyle = "#9e865e";
    ctx.font = "22px serif";
    ctx.letterSpacing = "9px";
    ctx.fillText("TENGER ATLS", 256, 90);

    ctx.strokeStyle = "#b99a65";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(256, 350, 145, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = "#705735";
    ctx.beginPath();
    ctx.arc(256, 350, 125, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = "#e4c78e";
    ctx.font = "150px serif";
    ctx.fillText(symbol || "✧", 256, 365);

    ctx.fillStyle = "#b99a65";
    ctx.fillRect(190, 555, 132, 2);

    ctx.fillStyle = "#e4d3b0";
    ctx.font = "32px serif";
    ctx.letterSpacing = "5px";
    ctx.fillText((title || "THE ORACLE").toUpperCase(), 256, 615);

    ctx.fillStyle = "#8f7955";
    ctx.font = "19px serif";
    ctx.fillText("THE ORACLE", 256, 675);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;

  return texture;
}

function OracleCard({
  card,
  index,
  position,
  active,
  onSelect,
}: {
  card: SceneCard;
  index: number;
  position: [number, number, number];
  active: boolean;
  onSelect: () => void;
}) {
  const group = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);

  const home = useMemo(
    () => new THREE.Vector3(...position),
    [position[0], position[1], position[2]],
  );

  const target = useRef(new THREE.Vector3(...position));

  const frontTexture = useMemo(
    () => createCardTexture(card.symbol, card.title),
    [card.symbol, card.title],
  );

  const backTexture = useMemo(() => createCardTexture("", "", true), []);

  useFrame((state, delta) => {
    if (!group.current) return;

    const t = state.clock.elapsedTime;

    target.current.set(
      active ? 0 : home.x,
      active ? 0 : home.y + Math.sin(t * 0.42 + index * 0.8) * 0.025,
      active ? 2.6 : home.z,
    );

    group.current.position.lerp(
      target.current,
      1 - Math.exp(-delta * (active ? 3 : 5)),
    );

    const scale = active ? 1.55 : hovered ? 1.055 : 1;

    group.current.scale.lerp(
      new THREE.Vector3(scale, scale, scale),
      1 - Math.exp(-delta * 5),
    );

    const targetY = active
      ? Math.PI
      : hovered
        ? -0.08
        : Math.sin(t * 0.25 + index) * 0.012;

    group.current.rotation.y = THREE.MathUtils.damp(
      group.current.rotation.y,
      targetY,
      4,
      delta,
    );

    group.current.rotation.x = THREE.MathUtils.damp(
      group.current.rotation.x,
      active ? 0 : -0.025,
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
        onSelect();
      }}
      onPointerOver={(event) => {
        event.stopPropagation();
        setHovered(true);
        document.body.style.cursor = "pointer";
      }}
      onPointerOut={() => {
        setHovered(false);
        document.body.style.cursor = "default";
      }}
    >
      {/* Картын үндсэн их бие */}
      <mesh castShadow receiveShadow>
        <boxGeometry args={[1.48, 2.18, 0.105]} />
        <meshStandardMaterial
          color="#17120f"
          metalness={0.48}
          roughness={0.38}
        />
      </mesh>

      {/* Картын нүүр */}
      <mesh position={[0, 0, 0.055]}>
        <planeGeometry args={[1.4, 2.1]} />
        <meshBasicMaterial map={frontTexture} toneMapped={false} />
      </mesh>

      {/* Картын ар тал */}
      <mesh position={[0, 0, -0.055]} rotation={[0, Math.PI, 0]}>
        <planeGeometry args={[1.4, 2.1]} />
        <meshBasicMaterial map={backTexture} toneMapped={false} />
      </mesh>

      {/* Hover гэрэл */}
      {hovered && (
        <pointLight
          position={[0, 0, 0.6]}
          color="#d8bd88"
          intensity={0.45}
          distance={2.5}
        />
      )}
    </group>
  );
}

function CameraRig() {
  const { camera, pointer } = useThree();

  useFrame((_, delta) => {
    camera.position.x = THREE.MathUtils.damp(
      camera.position.x,
      pointer.x * 0.18,
      1.5,
      delta,
    );

    camera.position.y = THREE.MathUtils.damp(
      camera.position.y,
      pointer.y * 0.1,
      1.5,
      delta,
    );

    camera.lookAt(0, 0, 0);
  });

  return null;
}

function Scene({ cards, onSelect, flippingId }: OracleSceneProps) {
  const { size } = useThree();

  const mobile = size.width < 680;
  const columns = mobile ? 3 : 4;
  const rows = Math.ceil(cards.length / columns);

  const gapX = mobile ? 1.55 : 2.05;
  const gapY = mobile ? 1.95 : 2.48;

  return (
    <>
      <color attach="background" args={["#0a0812"]} />
      <fog attach="fog" args={["#0a0812", 17, 32]} />

      <ambientLight intensity={0.75} />

      <directionalLight position={[-4, 6, 8]} intensity={1.8} color="#f1dfbd" />

      <pointLight
        position={[0, 0, -4]}
        intensity={9}
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
            onSelect={() => onSelect(card.id)}
          />
        );
      })}
    </>
  );
}

export default function OracleScene(props: OracleSceneProps) {
  return (
    <div className="relative h-[900px] w-full overflow-hidden bg-[#0a0812] sm:h-[820px] lg:h-[760px]">
      <div className="pointer-events-none absolute inset-0 z-10 bg-[radial-gradient(ellipse_at_50%_45%,rgba(153,113,65,0.10)_0%,rgba(10,8,18,0)_42%,rgba(10,8,18,0.35)_100%)]" />

      <Suspense
        fallback={
          <div className="flex h-full items-center justify-center text-xs tracking-[0.35em] text-[#b99a65]">
            TENGER ATLS
          </div>
        }
      >
        <Canvas
          camera={{ position: [0, 0, 11.8], fov: 42 }}
          dpr={[1, 1.5]}
          shadows
          gl={{
            antialias: true,
            alpha: false,
            powerPreference: "high-performance",
          }}
        >
          <Scene {...props} />
        </Canvas>
      </Suspense>

      <div className="pointer-events-none absolute bottom-5 left-0 right-0 z-20 text-center text-[9px] tracking-[0.42em] text-[#9c8156]">
        CHOOSE YOUR DESTINY
      </div>
    </div>
  );
}
