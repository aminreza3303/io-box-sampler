import { domainRelationships, domains, type DomainRecord, type DomainRelationship } from "./domain-map";

export type ArchitectureFloor = {
  id: string;
  title: string;
  label: string;
  height: number;
};

export type ArchitectureNode = {
  id: string;
  floorId: string;
  position: [number, number, number];
  domain: DomainRecord;
};

export type ArchitectureEdge = {
  id: string;
  from: string;
  to: string;
  fromPosition: [number, number, number];
  toPosition: [number, number, number];
  relationship: DomainRelationship;
  isCrossFloor: boolean;
};

const floorAssignments = [
  { id: "governance", title: "Governance", label: "حاکمیت", domains: ["policy", "limits", "admin-panel"] },
  { id: "core", title: "Core", label: "هسته", domains: ["kyc", "wallet", "currency", "card", "transfer", "qr"] },
  { id: "finance", title: "Finance", label: "مالی", domains: ["fx-market", "loan", "gold", "insurance", "special-offer", "buy-toman"] },
  { id: "ecosystem", title: "Ecosystem", label: "اکوسیستم", domains: ["tickets", "hotel", "agents", "topup", "snapp", "rates", "donations"] },
  { id: "experience", title: "Experience", label: "تجربه", domains: ["profile", "transactions", "support", "i18n", "redesign", "mobile"] },
] as const;

const floorHeight = 4;
export const architectureFloors: ArchitectureFloor[] = floorAssignments.map((floor, index) => ({
  id: floor.id,
  title: floor.title,
  label: floor.label,
  height: index * floorHeight,
}));

const floorHeightById = new Map(architectureFloors.map((floor) => [floor.id, floor.height] as const));

export const architectureNodes: ArchitectureNode[] = floorAssignments.flatMap((floor) =>
  floor.domains.map((id, index) => {
    const domain = domains.find((candidate) => candidate.id === id);
    if (!domain) throw new Error(`Architecture map references unknown domain: ${id}`);
    return {
      id,
      floorId: floor.id,
      position: [(index % 3) * 3 - 3, Math.floor(index / 3) * 3 - 1.5, floorHeightById.get(floor.id)!] as [number, number, number],
      domain,
    };
  }),
);

const nodeById = new Map(architectureNodes.map((node) => [node.id, node]));

export const architectureEdges: ArchitectureEdge[] = domainRelationships.map((relationship) => {
  const from = nodeById.get(relationship.from);
  const to = nodeById.get(relationship.to);
  if (!from || !to) throw new Error(`Architecture relationship references unknown node: ${relationship.from} -> ${relationship.to}`);
  return {
    id: `${relationship.from}->${relationship.to}`,
    from: relationship.from,
    to: relationship.to,
    fromPosition: from.position,
    toPosition: to.position,
    relationship,
    isCrossFloor: from.floorId !== to.floorId,
  };
});

export function getArchitectureNode(id: string): ArchitectureNode | undefined {
  return nodeById.get(id);
}

export function getArchitectureFloor(id: string): ArchitectureFloor | undefined {
  return architectureFloors.find((floor) => floor.id === id);
}
