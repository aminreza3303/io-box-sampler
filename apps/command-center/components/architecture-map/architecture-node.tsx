import { Html } from "@react-three/drei";
import { useState } from "react";
import type { ThreeEvent } from "@react-three/fiber";
import type { BufferGeometry } from "three";
import type { DomainGroupId } from "../../lib/domain-map";
import type { ArchitectureNode as ArchitectureNodeModel } from "../../lib/architecture-map";

const groupColors: Record<DomainGroupId, string> = {
  infra: "#22d3ee",
  core: "#fb7185",
  finance: "#fb923c",
  ecosystem: "#fbbf24",
  platform: "#34d399",
};

type ArchitectureNodeProps = {
  node: ArchitectureNodeModel;
  selected: boolean;
  dimmed: boolean;
  onSelect: (id: string) => void;
  bodyGeometry: BufferGeometry;
  ringGeometry: BufferGeometry;
  selectedRingGeometry: BufferGeometry;
};

export function ArchitectureNode({
  node,
  selected,
  dimmed,
  onSelect,
  bodyGeometry,
  ringGeometry,
  selectedRingGeometry,
}: ArchitectureNodeProps) {
  const [hovered, setHovered] = useState(false);
  const color = groupColors[node.domain.group];
  const opacity = dimmed ? 0.25 : 1;
  const worldPosition: [number, number, number] = [node.position[0], node.position[2] + 0.58, node.position[1]];

  const handlePointer = (event: ThreeEvent<PointerEvent>, nextHovered: boolean) => {
    event.stopPropagation();
    setHovered(nextHovered);
  };

  return (
    <group
      position={worldPosition}
      scale={hovered ? 1.09 : 1}
      onClick={(event) => {
        event.stopPropagation();
        onSelect(node.id);
      }}
      onPointerOut={(event) => handlePointer(event, false)}
      onPointerOver={(event) => handlePointer(event, true)}
    >
      <mesh castShadow>
        <primitive object={bodyGeometry} attach="geometry" />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={selected ? 0.65 : hovered ? 0.24 : 0.08}
          metalness={0.28}
          opacity={opacity}
          roughness={0.48}
          transparent={dimmed}
        />
      </mesh>

      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, -0.46, 0]}>
        <primitive object={selected ? selectedRingGeometry : ringGeometry} attach="geometry" />
        <meshBasicMaterial
          color={node.domain.status === "OPEN_DECISION" ? "#fbbf24" : "#4ade80"}
          opacity={dimmed ? 0.22 : selected ? 1 : 0.72}
          transparent
        />
      </mesh>

      {selected && <pointLight color={color} distance={4.5} intensity={2.2} position={[0, 0.7, 0]} />}

      <Html center position={[0, 0.72, 0]} sprite zIndexRange={[20, 0]}>
        <button
          type="button"
          dir="rtl"
          aria-label={`انتخاب دامنه ${node.domain.title}`}
          aria-pressed={selected}
          onClick={(event) => {
            event.stopPropagation();
            onSelect(node.id);
          }}
          onPointerDown={(event) => event.stopPropagation()}
          onPointerEnter={() => setHovered(true)}
          onPointerLeave={() => setHovered(false)}
          style={{
            background: selected ? "rgba(15, 23, 42, 0.98)" : "rgba(2, 6, 23, 0.88)",
            border: `1px solid ${selected ? color : `${color}88`}`,
            borderRadius: 8,
            boxShadow: selected ? `0 0 18px ${color}66` : "0 6px 16px rgba(0,0,0,0.28)",
            color: "#f8fafc",
            cursor: "pointer",
            display: "block",
            fontFamily: "Vazirmatn, sans-serif",
            fontSize: 11,
            fontWeight: 800,
            lineHeight: 1.4,
            opacity,
            padding: "4px 8px",
            textAlign: "center",
            whiteSpace: "nowrap",
          }}
        >
          {node.domain.title}
        </button>
      </Html>
    </group>
  );
}
