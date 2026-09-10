"use client";

import { OrbitControls } from "@react-three/drei";
import { Canvas, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import { Color, Fog, Vector3 } from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import {
  architectureFloors,
  getArchitectureFloor,
  type ArchitectureEdge,
  type ArchitectureNode,
} from "../../lib/architecture-map";
import { ArchitectureEdge as ArchitectureEdgeView } from "./architecture-edge";
import { ArchitectureFloor } from "./architecture-floor";
import { ArchitectureNode as ArchitectureNodeView } from "./architecture-node";

export type ArchitectureCameraPreset = "isometric" | "top" | "selected-floor";

export type ArchitectureSceneProps = {
  visibleFloorIds: string[];
  nodes: ArchitectureNode[];
  edges: ArchitectureEdge[];
  selectedId: string;
  selectedFloorId?: string;
  onSelectNode: (id: string) => void;
  onSelectFloor: (floorId: string) => void;
  cameraPreset: ArchitectureCameraPreset;
  resetToken: number;
  reducedMotion: boolean;
};

type CameraRigProps = Pick<ArchitectureSceneProps, "cameraPreset" | "resetToken" | "selectedFloorId">;

function CameraRig({ cameraPreset, resetToken, selectedFloorId }: CameraRigProps) {
  const { camera } = useThree();
  const controlsRef = useRef<OrbitControlsImpl>(null);
  const focusFloorId = cameraPreset === "selected-floor" ? selectedFloorId : undefined;

  useEffect(() => {
    const selectedHeight = focusFloorId ? (getArchitectureFloor(focusFloorId)?.height ?? 8) : 8;
    const target = cameraPreset === "selected-floor" ? new Vector3(0, selectedHeight, 0) : new Vector3(0, 8, 0);
    const position =
      cameraPreset === "top"
        ? new Vector3(0, 32, 0.01)
        : cameraPreset === "selected-floor"
          ? new Vector3(12, selectedHeight + 7.5, 14)
          : new Vector3(18, 17, 22);

    camera.position.copy(position);
    camera.up.set(0, 1, 0);
    camera.lookAt(target);
    camera.updateProjectionMatrix();

    if (controlsRef.current) {
      controlsRef.current.target.copy(target);
      controlsRef.current.update();
    }
  }, [camera, cameraPreset, focusFloorId, resetToken]);

  return (
    <OrbitControls
      ref={controlsRef}
      enableDamping
      dampingFactor={0.08}
      maxDistance={48}
      maxPolarAngle={Math.PI / 2.05}
      minDistance={7}
    />
  );
}

function SceneContents(props: ArchitectureSceneProps) {
  const visibleFloorIdSet = useMemo(() => new Set(props.visibleFloorIds), [props.visibleFloorIds]);
  const visibleFloors = useMemo(
    () => architectureFloors.filter((floor) => visibleFloorIdSet.has(floor.id)),
    [visibleFloorIdSet],
  );
  const visibleNodes = useMemo(
    () => props.nodes.filter((node) => visibleFloorIdSet.has(node.floorId)),
    [props.nodes, visibleFloorIdSet],
  );
  const visibleNodeIds = useMemo(() => new Set(visibleNodes.map((node) => node.id)), [visibleNodes]);
  const visibleEdges = useMemo(
    () => props.edges.filter((edge) => visibleNodeIds.has(edge.from) && visibleNodeIds.has(edge.to)),
    [props.edges, visibleNodeIds],
  );
  const connectedIds = useMemo(() => {
    const ids = new Set<string>();
    visibleEdges.forEach((edge) => {
      if (edge.from === props.selectedId || edge.to === props.selectedId) {
        ids.add(edge.from);
        ids.add(edge.to);
      }
    });
    return ids;
  }, [props.selectedId, visibleEdges]);

  return (
    <>
      <color attach="background" args={["#020617"]} />
      <fog attach="fog" args={["#020617", 26, 58]} />
      <ambientLight intensity={0.62} />
      <directionalLight castShadow color="#e0f2fe" intensity={2.1} position={[10, 22, 12]} />
      <pointLight color="#7dd3fc" distance={34} intensity={1.1} position={[-12, 13, 8]} />

      {visibleFloors.map((floor) => (
        <ArchitectureFloor
          key={floor.id}
          floor={floor}
          selected={floor.id === props.selectedFloorId}
          onSelect={props.onSelectFloor}
        />
      ))}

      {visibleEdges.map((edge) => (
        <ArchitectureEdgeView
          key={edge.id}
          edge={edge}
          active={edge.from === props.selectedId || edge.to === props.selectedId}
          reducedMotion={props.reducedMotion}
        />
      ))}

      {visibleNodes.map((node) => (
        <ArchitectureNodeView
          key={node.id}
          node={node}
          selected={node.id === props.selectedId}
          dimmed={connectedIds.size > 0 && node.id !== props.selectedId && !connectedIds.has(node.id)}
          onSelect={props.onSelectNode}
        />
      ))}

      <CameraRig
        cameraPreset={props.cameraPreset}
        resetToken={props.resetToken}
        selectedFloorId={props.selectedFloorId}
      />
    </>
  );
}

export function ArchitectureScene(props: ArchitectureSceneProps) {
  return (
    <div style={{ width: "100%", height: "100%", minHeight: 560, background: "#020617" }}>
      <Canvas
        camera={{ far: 100, fov: 46, near: 0.1, position: [18, 17, 22] }}
        dpr={[1, 1.75]}
        gl={{ antialias: true, alpha: false, powerPreference: "high-performance" }}
        onCreated={({ scene }) => {
          scene.background = new Color("#020617");
          scene.fog = new Fog("#020617", 26, 58);
        }}
        shadows
      >
        <SceneContents {...props} />
      </Canvas>
    </div>
  );
}
