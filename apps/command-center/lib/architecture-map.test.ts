import { describe, expect, it } from "vitest";
import { architectureEdges, architectureFloors, architectureNodes, getArchitectureFloor, getArchitectureNode } from "./architecture-map";
import { filterEdgesToVisibleNodes, resolveVisibleSelection } from "./architecture-map-page-model";
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

  it("keeps only edges whose endpoints are both visible", () => {
    const visibleNodes = architectureNodes.filter((node) => ["currency", "wallet"].includes(node.id));
    const visibleEdges = filterEdgesToVisibleNodes(visibleNodes, architectureEdges);

    expect(visibleEdges.map((edge) => edge.id)).toEqual(["currency->wallet"]);
    expect(visibleEdges.every((edge) => visibleNodes.some((node) => node.id === edge.from) && visibleNodes.some((node) => node.id === edge.to))).toBe(true);
  });

  it("replaces a hidden selection with wallet or the first visible node", () => {
    const walletVisible = architectureNodes.filter((node) => ["currency", "wallet"].includes(node.id));
    const walletHidden = architectureNodes.filter((node) => ["policy", "limits"].includes(node.id));

    expect(resolveVisibleSelection(walletVisible, "gold")).toBe("wallet");
    expect(resolveVisibleSelection(walletHidden, "gold")).toBe("policy");
    expect(resolveVisibleSelection([], "gold")).toBeUndefined();
    expect(resolveVisibleSelection(walletVisible, "currency")).toBe("currency");
  });
});
