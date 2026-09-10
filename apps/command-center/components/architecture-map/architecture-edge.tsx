import { Html, Line } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useId, useMemo, useRef, useState } from "react";
import { CatmullRomCurve3, Mesh, Vector3 } from "three";
import type { ThreeEvent } from "@react-three/fiber";
import type { BufferGeometry } from "three";
import type { ArchitectureEdge as ArchitectureEdgeModel } from "../../lib/architecture-map";

type ArchitectureEdgeProps = {
  edge: ArchitectureEdgeModel;
  active: boolean;
  reducedMotion: boolean;
  signalGeometry: BufferGeometry;
};

function toWorldPosition(position: [number, number, number]): Vector3 {
  return new Vector3(position[0], position[2] + 0.74, position[1]);
}

export function ArchitectureEdge({ edge, active, reducedMotion, signalGeometry }: ArchitectureEdgeProps) {
  const tooltipId = useId();
  const [lineHovered, setLineHovered] = useState(false);
  const [triggerHovered, setTriggerHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const signalRef = useRef<Mesh>(null);
  const curve = useMemo(() => {
    const start = toWorldPosition(edge.fromPosition);
    const end = toWorldPosition(edge.toPosition);
    const midpoint = start.clone().lerp(end, 0.5);

    if (edge.isCrossFloor) {
      const bend = Math.abs(end.y - start.y) > 8 ? 1.25 : 0.75;
      return new CatmullRomCurve3([
        start,
        new Vector3(start.x + bend, midpoint.y, start.z),
        new Vector3(end.x - bend, midpoint.y, end.z),
        end,
      ]);
    }

    midpoint.z += start.x <= end.x ? 0.48 : -0.48;
    return new CatmullRomCurve3([start, midpoint, end]);
  }, [edge.fromPosition, edge.isCrossFloor, edge.toPosition]);
  const points = useMemo(() => curve.getPoints(edge.isCrossFloor ? 32 : 20), [curve, edge.isCrossFloor]);
  const tooltipPosition = useMemo(() => curve.getPoint(0.5), [curve]);

  useFrame(({ clock }) => {
    if (!signalRef.current || reducedMotion || !active) return;
    const position = curve.getPoint((clock.elapsedTime * 0.18) % 1);
    signalRef.current.position.copy(position);
  });

  const handleLinePointer = (event: ThreeEvent<PointerEvent>, nextHovered: boolean) => {
    event.stopPropagation();
    setLineHovered(nextHovered);
  };

  const tooltipVisible = lineHovered || triggerHovered || focused;
  const color = active ? "#67e8f9" : tooltipVisible ? "#94a3b8" : "#475569";

  return (
    <group>
      <Line
        color={color}
        lineWidth={active ? 2.4 : tooltipVisible ? 1.8 : 1}
        opacity={active ? 0.95 : tooltipVisible ? 0.62 : 0.2}
        points={points}
        transparent
        onPointerOut={(event) => handleLinePointer(event, false)}
        onPointerOver={(event) => handleLinePointer(event, true)}
      />

      {active && !reducedMotion && (
        <mesh ref={signalRef} position={points[0]}>
          <primitive object={signalGeometry} attach="geometry" />
          <meshStandardMaterial color="#cffafe" emissive="#22d3ee" emissiveIntensity={2.5} />
          <pointLight color="#22d3ee" distance={1.6} intensity={1.2} />
        </mesh>
      )}

      <Html center position={tooltipPosition} sprite zIndexRange={[40, 0]}>
        <div
          dir="rtl"
          onPointerEnter={() => setTriggerHovered(true)}
          onPointerLeave={() => setTriggerHovered(false)}
          style={{ position: "relative", width: 18, height: 18 }}
        >
          <button
            type="button"
            aria-label={`ارتباط ${edge.relationship.label}`}
            aria-describedby={tooltipId}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            style={{
              width: 18,
              height: 18,
              padding: 0,
              border: "1px solid rgba(103, 232, 249, 0.72)",
              borderRadius: 999,
              background: tooltipVisible ? "#67e8f9" : "rgba(15, 23, 42, 0.72)",
              boxShadow: focused ? "0 0 0 3px rgba(103, 232, 249, 0.45)" : "none",
              cursor: "help",
            }}
          />
          <div
            id={tooltipId}
            role="tooltip"
            style={{
              position: "absolute",
              bottom: 24,
              left: "50%",
              transform: "translateX(-50%)",
              background: "rgba(2, 6, 23, 0.96)",
              border: "1px solid rgba(103, 232, 249, 0.55)",
              borderRadius: 8,
              color: "#f8fafc",
              fontFamily: "Vazirmatn, sans-serif",
              fontSize: 11,
              fontWeight: 700,
              lineHeight: 1.6,
              opacity: tooltipVisible ? 1 : 0,
              padding: "6px 9px",
              pointerEvents: "none",
              transition: "opacity 120ms ease",
              visibility: tooltipVisible ? "visible" : "hidden",
              width: "max-content",
              maxWidth: 260,
              whiteSpace: "nowrap",
            }}
          >
            <strong>{edge.relationship.label}</strong>
            <span style={{ display: "block", color: "#cbd5e1", fontWeight: 500 }}>
              {edge.relationship.explanation}
            </span>
          </div>
        </div>
      </Html>
    </group>
  );
}
