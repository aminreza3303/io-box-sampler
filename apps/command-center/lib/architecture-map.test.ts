import { describe, expect, it } from "vitest";
import { architectureEdges, architectureFloors, architectureNodes, getArchitectureFloor, getArchitectureNode } from "./architecture-map";
import { domainRelationships, domains } from "./domain-map";

describe("architecture map model", () => {
  it("places every domain exactly once across five floors", () => {
    expect(architectureFloors).toHaveLength(5);
    expect(architectureNodes).toHaveLength(domains.length);
    expect(new Set(architectureNodes.map((node) => node.id)).size).toBe(domains.length);
    expect(architectureNodes.every((node) => node.floorId && node.position.length === 3)).toBe(true);

    expect(Object.fromEntries(architectureFloors.map((floor) => [floor.id, architectureNodes.filter((node) => node.floorId === floor.id).map((node) => node.id)]))).toEqual({
      governance: ["policy", "limits", "admin-panel"],
      core: ["kyc", "wallet", "currency", "card", "transfer", "qr"],
      finance: ["fx-market", "loan", "gold", "insurance", "special-offer", "buy-toman"],
      ecosystem: ["tickets", "hotel", "agents", "topup", "snapp", "rates", "donations"],
      experience: ["profile", "transactions", "support", "i18n", "redesign", "mobile"],
    });
    expect(architectureNodes.every((node) => node.position[2] === getArchitectureFloor(node.floorId)?.height)).toBe(true);
    expect(architectureFloors.map((floor) => getArchitectureFloor(floor.id))).toEqual(architectureFloors);
    expect(getArchitectureFloor("missing")).toBeUndefined();
  });

  it("derives every relationship and marks cross-floor edges", () => {
    expect(architectureEdges).toHaveLength(domainRelationships.length);
    expect(architectureEdges.every((edge) => edge.fromPosition.length === 3 && edge.toPosition.length === 3)).toBe(true);
    expect(architectureEdges.some((edge) => edge.isCrossFloor)).toBe(true);
    expect(architectureEdges.every((edge) => edge.fromPosition === getArchitectureNode(edge.from)?.position && edge.toPosition === getArchitectureNode(edge.to)?.position)).toBe(true);
  });

  it("keeps the gold domain in the shared source model", () => {
    expect(getArchitectureNode("gold")?.domain.title).toBe("طلا");
  });
});
