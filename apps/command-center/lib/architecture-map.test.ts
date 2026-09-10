import { describe, expect, it } from "vitest";
import { architectureEdges, architectureFloors, architectureNodes, getArchitectureNode } from "./architecture-map";
import { domainRelationships, domains } from "./domain-map";

describe("architecture map model", () => {
  it("places every domain exactly once across five floors", () => {
    expect(architectureFloors).toHaveLength(5);
    expect(architectureNodes).toHaveLength(domains.length);
    expect(new Set(architectureNodes.map((node) => node.id)).size).toBe(domains.length);
    expect(architectureNodes.every((node) => node.floorId && node.position.length === 3)).toBe(true);
  });

  it("derives every relationship and marks cross-floor edges", () => {
    expect(architectureEdges).toHaveLength(domainRelationships.length);
    expect(architectureEdges.every((edge) => edge.fromPosition.length === 3 && edge.toPosition.length === 3)).toBe(true);
    expect(architectureEdges.some((edge) => edge.isCrossFloor)).toBe(true);
  });

  it("keeps the gold domain in the shared source model", () => {
    expect(getArchitectureNode("gold")?.domain.title).toBe("طلا");
  });
});
