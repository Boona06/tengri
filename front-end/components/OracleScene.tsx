"use client";

import { Suspense, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Stars, Sparkles, useTexture } from "@react-three/drei";
import { Bloom, EffectComposer, Vignette } from "@react-three/postprocessing";
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

function CardArtwork({ url }: { url: string }) {
  const texture = useTexture(url);
  texture.colorSpace = THREE.SRGBColorSpace;

  return (
    <mesh position={[0, 0, 0.046]}>
      <planeGeometry args={[0.76, 1.16]} />
      <meshBasicMaterial map={texture} toneMapped={false} />
    </mesh>
  );
}

function GoldFrame() {
  const gold = "#d7b66f";

  return (
    <group position={[0, 0, 0.052]}>
      <mesh position={[0, 0.65, 0]}>
        <boxGeometry args={[0.82, 0.018, 0.014]} />
        <meshStandardMaterial
          color={gold}
          metalness={0.9}
          roughness={0.2}
          emissive="#704717"
          emissiveIntensity={0.35}
        />
      </mesh>

      <mesh position={[0, -0.65, 0]}>
        <boxGeometry args={[0.82, 0.018, 0.014]} />
        <meshStandardMaterial
          color={gold}
          metalness={0.9}
          roughness={0.2}
          emissive="#704717"
          emissiveIntensity={0.35}
        />
      </mesh>

      <mesh position={[-0.41, 0, 0]}>
        <boxGeometry args={[0.018, 1.3, 0.014]} />
        <meshStandardMaterial
          color={gold}
          metalness={0.9}
          roughness={0.2}
          emissive="#704717"
          emissiveIntensity={0.35}
        />
      </mesh>

      <mesh position={[0.41, 0, 0]}>
        <boxGeometry args={[0.018, 1.3, 0.014]} />
        <meshStandardMaterial
          color={gold}
          metalness={0.9}
          roughness={0.2}
          emissive="#704717"
          emissiveIntensity={0.35}
        />
      </mesh>
    </group>
  );
}

function CardEmblem({ index }: { index: number }) {
  const crystal = useRef<THREE.Group>(null);

  useFrame((state, delta) => {
    if (!crystal.current) return;

    crystal.current.rotation.y += delta * 0.45;
    crystal.current.rotation.x =
      Math.sin(state.clock.elapsedTime * 0.7 + index) * 0.12;
  });

  return (
    <group ref={crystal}>
      <mesh>
        <icosahedronGeometry args={[0.17, 1]} />
        <meshPhysicalMaterial
          color="#d9b66d"
          emissive="#8b521e"
          emissiveIntensity={0.7}
          metalness={0.8}
          roughness={0.15}
          clearcoat={1}
        />
      </mesh>

      <mesh rotation={[0, 0, Math.PI / 4]}>
        <torusGeometry args={[0.29, 0.009, 8, 64]} />
        <meshBasicMaterial color="#e9c984" />
      </mesh>

      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.23, 0.008, 8, 64]} />
        <meshBasicMaterial color="#9d72d6" />
      </mesh>
    </group>
  );
}

function CardBack() {
  return (
    <group position={[0, 0, -0.052]} rotation={[0, Math.PI, 0]}>
      <mesh>
        <planeGeometry args={[0.82, 1.28]} />
        <meshStandardMaterial color="#21132e" metalness={0.6} roughness={0.3} />
      </mesh>

      <mesh position={[0, 0, 0.008]}>
        <torusGeometry args={[0.3, 0.012, 10, 64]} />
        <meshStandardMaterial
          color="#d8b778"
          emissive="#855b28"
          emissiveIntensity={0.8}
          metalness={0.8}
        />
      </mesh>

      <mesh position={[0, 0, 0.012]}>
        <octahedronGeometry args={[0.16, 1]} />
        <meshStandardMaterial
          color="#e5c784"
          emissive="#9e5c31"
          emissiveIntensity={0.8}
          metalness={0.8}
          roughness={0.15}
        />
      </mesh>

      <mesh position={[0, 0, 0.01]}>
        <torusGeometry args={[0.43, 0.008, 8, 64]} />
        <meshBasicMaterial color="#a98a58" />
      </mesh>
    </group>
  );
}

function OracleCard({
  card,
  index,
  position,
  active,
  onSelect,
  compact,
}: {
  card: SceneCard;
  index: number;
  position: [number, number, number];
  active: boolean;
  onSelect: () => void;
  compact: boolean;
}) {
  const group = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);

  const targetPosition = useRef(new THREE.Vector3());
  const targetScale = useRef(new THREE.Vector3(1, 1, 1));

  useFrame((state, delta) => {
    if (!group.current) return;

    const time = state.clock.elapsedTime;

    if (active) {
      targetPosition.current.set(0, 0, 3.3);
      targetScale.current.setScalar(1.5);
    } else {
      targetPosition.current.set(
        position[0] + Math.sin(time * 0.4 + index) * 0.035,
        position[1] + Math.sin(time * 0.75 + index * 0.8) * 0.075,
        position[2] + Math.sin(time * 0.5 + index) * 0.06,
      );

      const scale = hovered ? 1.12 : 1;
      targetScale.current.setScalar(scale);
    }

    const speed = 1 - Math.exp(-delta * (active ? 3.5 : 5.5));

    group.current.position.lerp(targetPosition.current, speed);
    group.current.scale.lerp(targetScale.current, speed);

    const rotationY = active
      ? Math.PI
      : hovered
        ? -0.18
        : Math.sin(time * 0.5 + index) * 0.045;

    group.current.rotation.y = THREE.MathUtils.damp(
      group.current.rotation.y,
      rotationY,
      active ? 3.3 : 4,
      delta,
    );

    const rotationX = active
      ? 0
      : hovered
        ? 0.1
        : Math.sin(time * 0.65 + index) * 0.035;

    group.current.rotation.x = THREE.MathUtils.damp(
      group.current.rotation.x,
      rotationX,
      4,
      delta,
    );

    group.current.rotation.z = THREE.MathUtils.damp(
      group.current.rotation.z,
      hovered ? 0.04 : 0,
      4,
      delta,
    );
  });

  const cardWidth = compact ? 0.78 : 0.9;
  const cardHeight = compact ? 1.17 : 1.35;

  return (
    <group
      ref={group}
      position={position}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHovered(true);
        document.body.style.cursor = "pointer";
      }}
      onPointerOut={() => {
        setHovered(false);
        document.body.style.cursor = "default";
      }}
    >
      <mesh castShadow receiveShadow>
        <boxGeometry args={[cardWidth, cardHeight, 0.08]} />
        <meshPhysicalMaterial
          color="#21152d"
          metalness={0.72}
          roughness={0.24}
          clearcoat={1}
          clearcoatRoughness={0.12}
        />
      </mesh>

      <GoldFrame />

      {card.cover ? (
        <CardArtwork url={card.cover} />
      ) : (
        <group position={[0, 0, 0.065]}>
          <CardEmblem index={index} />
        </group>
      )}

      <CardBack />

      <Sparkles
        count={hovered || active ? 26 : 5}
        scale={[1.15, 1.4, 0.25]}
        size={2.4}
        speed={0.35}
        opacity={0.8}
        color="#edca83"
      />

      <pointLight
        position={[0, 0, 0.25]}
        intensity={hovered || active ? 2.2 : 0.25}
        color="#d6a75c"
        distance={2.3}
      />
    </group>
  );
}

function Portal() {
  const portal = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (!portal.current) return;

    portal.current.rotation.z =
      Math.sin(state.clock.elapsedTime * 0.12) * 0.025;

    portal.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.09) * 0.04;
  });

  return (
    <group ref={portal} position={[0, 0, -3.5]}>
      <mesh>
        <torusGeometry args={[4.2, 0.022, 16, 160]} />
        <meshBasicMaterial color="#b88b4d" transparent opacity={0.5} />
      </mesh>

      <mesh rotation={[0, 0, Math.PI / 2]}>
        <torusGeometry args={[3.85, 0.012, 12, 160]} />
        <meshBasicMaterial color="#72529b" transparent opacity={0.48} />
      </mesh>

      <mesh rotation={[0, 0, Math.PI / 4]}>
        <torusGeometry args={[3.55, 0.008, 12, 160]} />
        <meshBasicMaterial color="#e7c17a" transparent opacity={0.3} />
      </mesh>
    </group>
  );
}

function CameraRig() {
  useFrame((state, delta) => {
    const targetX = state.pointer.x * 0.55;
    const targetY = state.pointer.y * 0.35;

    state.camera.position.x = THREE.MathUtils.damp(
      state.camera.position.x,
      targetX,
      2,
      delta,
    );

    state.camera.position.y = THREE.MathUtils.damp(
      state.camera.position.y,
      targetY,
      2,
      delta,
    );

    state.camera.lookAt(0, 0, 0);
  });

  return null;
}

function OracleWorld({ cards, onSelect, flippingId }: OracleSceneProps) {
  const { size } = useThree();
  const compact = size.width < 700;

  const columns = compact ? 3 : 4;
  const rows = Math.ceil(cards.length / columns);

  const spacingX = compact ? 1.32 : 1.8;
  const spacingY = compact ? 1.48 : 1.82;

  return (
    <>
      <color attach="background" args={["#0a0812"]} />

      <ambientLight intensity={0.55} />

      <directionalLight position={[0, 7, 8]} intensity={2.2} color="#ffe4b6" />

      <pointLight
        position={[-5, 2, 4]}
        intensity={45}
        color="#914cff"
        distance={16}
      />

      <pointLight
        position={[5, -2, 5]}
        intensity={38}
        color="#e8ad55"
        distance={15}
      />

      <spotLight
        position={[0, 5, 7]}
        angle={0.8}
        penumbra={0.8}
        intensity={35}
        color="#fff0cf"
        castShadow
      />

      <Stars
        radius={45}
        depth={45}
        count={900}
        factor={2.7}
        saturation={0.3}
        fade
        speed={0.45}
      />

      <Sparkles
        count={130}
        scale={[15, 9, 5]}
        size={2.6}
        speed={0.3}
        opacity={0.75}
        color="#d8b16e"
      />

      <Portal />
      <CameraRig />

      {cards.map((card, index) => {
        const column = index % columns;
        const row = Math.floor(index / columns);

        const x = (column - (columns - 1) / 2) * spacingX;
        const y = ((rows - 1) / 2 - row) * spacingY;
        const z = -Math.abs(column - (columns - 1) / 2) * 0.12;

        return (
          <OracleCard
            key={card.id}
            card={card}
            index={index}
            position={[x, y, z]}
            active={flippingId === card.id}
            onSelect={() => onSelect(card.id)}
            compact={compact}
          />
        );
      })}

      <EffectComposer>
        <Bloom
          intensity={1.35}
          luminanceThreshold={0.2}
          luminanceSmoothing={0.85}
          mipmapBlur
        />
        <Vignette eskil={false} offset={0.22} darkness={0.8} />
      </EffectComposer>
    </>
  );
}

export default function OracleScene({
  cards,
  onSelect,
  flippingId,
}: OracleSceneProps) {
  return (
    <div
      className="relative h-[780px] w-full overflow-hidden rounded-3xl border border-[#a88650]/20 md:h-[660px]"
      style={{
        background:
          "radial-gradient(ellipse at center, #21132e 0%, #100b19 55%, #080710 100%)",
      }}
    >
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-96 w-96 -translate-x-1/2 -translate-y-1/2 rounded-full bg-purple-700/10 blur-[110px]" />

      <Suspense
        fallback={
          <div className="flex h-full items-center justify-center text-sm tracking-[0.3em] text-[#c7a66d]">
            TENGER ATLS · LOADING
          </div>
        }
      >
        <Canvas
          camera={{ position: [0, 0, 12], fov: 42 }}
          dpr={[1, 1.5]}
          gl={{
            antialias: true,
            alpha: false,
            powerPreference: "high-performance",
          }}
        >
          <OracleWorld
            cards={cards}
            onSelect={onSelect}
            flippingId={flippingId}
          />
        </Canvas>
      </Suspense>

      <div className="pointer-events-none absolute bottom-5 left-0 right-0 text-center text-[9px] tracking-[0.4em] text-[#c0a276]/60">
        CHOOSE YOUR DESTINY
      </div>
    </div>
  );
}
