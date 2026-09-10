import { Grid, Html } from "@react-three/drei";
import type { BufferGeometry } from "three";
import type { ArchitectureFloor as ArchitectureFloorModel } from "../../lib/architecture-map";

const floorAccents: Record<string, string> = {
  governance: "#22d3ee",
  core: "#fb7185",
  finance: "#fb923c",
  ecosystem: "#fbbf24",
  experience: "#34d399",
};

type ArchitectureFloorProps = {
  floor: ArchitectureFloorModel;
  selected: boolean;
  onSelect: (floorId: string) => void;
  slabGeometry: BufferGeometry;
};

export function ArchitectureFloor({ floor, selected, onSelect, slabGeometry }: ArchitectureFloorProps) {
  const accent = floorAccents[floor.id] ?? "#94a3b8";

  return (
    <group position={[0, floor.height, 0]}>
      <mesh receiveShadow position={[0, -0.12, 0]}>
        <primitive object={slabGeometry} attach="geometry" />
        <meshStandardMaterial
          color={accent}
          emissive={accent}
          emissiveIntensity={selected ? 0.13 : 0.035}
          metalness={0.16}
          opacity={selected ? 0.24 : 0.14}
          roughness={0.72}
          transparent
        />
      </mesh>

      <Grid
        args={[11.8, 8.8]}
        cellColor={accent}
        cellSize={0.6}
        cellThickness={0.45}
        fadeDistance={18}
        fadeStrength={1}
        position={[0, 0.015, 0]}
        sectionColor={accent}
        sectionSize={3}
        sectionThickness={0.8}
      />

      <Html center position={[-7.15, 0.42, 0]} transform sprite zIndexRange={[30, 0]}>
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onSelect(floor.id);
          }}
          onPointerDown={(event) => event.stopPropagation()}
          aria-pressed={selected}
          style={{
            background: selected ? accent : "rgba(2, 6, 23, 0.9)",
            border: `1px solid ${accent}`,
            borderRadius: 999,
            boxShadow: selected ? `0 0 22px ${accent}77` : "0 8px 24px rgba(0,0,0,0.3)",
            color: selected ? "#020617" : "#f8fafc",
            cursor: "pointer",
            fontFamily: "inherit",
            fontSize: 13,
            fontWeight: 800,
            padding: "7px 12px",
            whiteSpace: "nowrap",
          }}
        >
          {floor.label}
        </button>
      </Html>
    </group>
  );
}
