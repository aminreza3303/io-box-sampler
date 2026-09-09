import { describe, expect, it } from "vitest";
import { domains, domainGroups, domainRelationships, getDomainById, roadmapSteps } from "../../lib/domain-map";

describe("newcash domain map", () => {
  it("contains the 28 product domains across the five map groups", () => {
    expect(domains).toHaveLength(28);
    expect(domainGroups).toHaveLength(5);
    expect(domainGroups.reduce((count, group) => count + group.domains.length, 0)).toBe(28);
    expect(getDomainById("loan")?.title).toBe("وام");
    expect(getDomainById("currency")?.rules[0]).toContain("W-1");
  });

  it("keeps every relationship connected to a known domain", () => {
    const ids = new Set(domains.map((domain) => domain.id));
    expect(domainRelationships.length).toBeGreaterThan(35);
    for (const relationship of domainRelationships) {
      expect(ids.has(relationship.from)).toBe(true);
      expect(ids.has(relationship.to)).toBe(true);
      expect(relationship.explanation.length).toBeGreaterThan(20);
    }
  });

  it("orders the roadmap from discovery to ecosystem", () => {
    expect(roadmapSteps).toHaveLength(5);
    expect(roadmapSteps.map((step) => step.id)).toEqual(["discovery", "foundation", "core", "financial", "ecosystem"]);
    expect(roadmapSteps.every((step) => step.exitCriteria.length > 10)).toBe(true);
  });
});
