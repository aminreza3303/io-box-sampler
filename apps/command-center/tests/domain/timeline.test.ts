import { describe, expect, it } from "vitest";
import {
  buildTimelineColumns,
  getPhaseBarGeometry,
  phaseOrder,
  phaseLabels,
  type TimelineRange,
} from "../../components/command-center/timeline-grid";

const range: TimelineRange = {
  start: "2026-09-01T00:00:00.000Z",
  end: "2026-09-11T00:00:00.000Z",
};

describe("timeline geometry", () => {
  it("builds contiguous date columns and preserves readable RTL labels", () => {
    const columns = buildTimelineColumns(range, "day");

    expect(columns).toHaveLength(10);
    expect(columns[0]).toMatchObject({ index: 0, start: "2026-09-01", end: "2026-09-02" });
    expect(columns.at(-1)).toMatchObject({ start: "2026-09-10", end: "2026-09-11" });
    expect(columns.every((column) => column.label.length > 0)).toBe(true);
    expect(columns.every((column) => column.left >= 0 && column.width > 0)).toBe(true);
  });

  it("always represents the canonical four phases in order", () => {
    expect(phaseOrder).toEqual(["PRODUCT", "DESIGN", "DEVELOPMENT", "DELIVERY"]);
    expect(phaseOrder.map((phase) => phaseLabels[phase])).toEqual([
      "محصول", "طراحی", "توسعه", "تحویل",
    ]);
  });

  it("aligns bars to dates and clips phases at the visible range", () => {
    expect(getPhaseBarGeometry({ startDate: "2026-08-30", endDate: "2026-09-04" }, range))
      .toMatchObject({ left: 0, width: 30, clipped: true });
    expect(getPhaseBarGeometry({ startDate: "2026-09-04", endDate: "2026-09-07" }, range))
      .toMatchObject({ left: 30, width: 30, clipped: false });
    expect(getPhaseBarGeometry({ startDate: "2026-09-09", endDate: "2026-09-15" }, range))
      .toMatchObject({ left: 80, width: 20, clipped: true });
  });

  it("returns a minimum visible marker for a zero-length phase", () => {
    const geometry = getPhaseBarGeometry({ startDate: "2026-09-05", endDate: "2026-09-05" }, range);

    expect(geometry).toMatchObject({ left: 40, width: 8, isMarker: true, clipped: false });
  });

  it("does not render phases completely outside the range", () => {
    expect(getPhaseBarGeometry({ startDate: "2026-08-01", endDate: "2026-08-03" }, range)).toBeNull();
    expect(getPhaseBarGeometry({ startDate: "2026-09-12", endDate: "2026-09-13" }, range)).toBeNull();
  });
});
