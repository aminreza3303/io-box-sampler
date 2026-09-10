import type { ArchitectureEdge, ArchitectureNode } from "./architecture-map";

export function filterEdgesToVisibleNodes(
  nodes: ArchitectureNode[],
  edges: ArchitectureEdge[],
): ArchitectureEdge[] {
  const visibleIds = new Set(nodes.map((node) => node.id));
  return edges.filter((edge) => visibleIds.has(edge.from) && visibleIds.has(edge.to));
}

export function resolveVisibleSelection(
  nodes: ArchitectureNode[],
  selectedId: string,
  preferredId = "wallet",
): string | undefined {
  if (nodes.some((node) => node.id === selectedId)) return selectedId;
  return nodes.find((node) => node.id === preferredId)?.id ?? nodes[0]?.id;
}
