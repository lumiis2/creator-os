import { describe, expect, it } from "vitest";
import { computeEngagementRate, computeGrowthRate } from "./compute";

describe("analytics compute", () => {
  it("computes engagement rate", () => {
    expect(computeEngagementRate(1000, 100, 20, 10)).toBeCloseTo(13);
  });

  it("returns null engagement for zero views", () => {
    expect(computeEngagementRate(0, 1, 1, 1)).toBeNull();
  });

  it("computes growth rate", () => {
    expect(computeGrowthRate(150, 100)).toBeCloseTo(50);
  });

  it("returns null growth for zero baseline", () => {
    expect(computeGrowthRate(100, 0)).toBeNull();
  });
});
