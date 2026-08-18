import { describe, expect, it } from "vitest";
import {
  BODY_REGIONS,
  BODY_REGION_IDS,
  UNDISPLAYABLE_MUSCLES,
  musclesInRegion,
  needsSplit,
  regionOf,
} from "../src/body-map.ts";
import { MUSCLE_IDS } from "../src/taxonomy.ts";

describe("筋肉と人体図の領域の対応（ADR 0003）", () => {
  it("すべての分類が領域を持つか、表示できない理由を持つ", () => {
    // どちらでもない分類があると、図から黙って消える。
    for (const id of MUSCLE_IDS) {
      const displayable = regionOf(id) !== null;
      const explained = id in UNDISPLAYABLE_MUSCLES;
      expect(displayable !== explained, id).toBe(true);
    }
  });

  it("腹横筋は表示できない（深層筋で体表に出ない）", () => {
    expect(regionOf("transversus_abdominis")).toBe(null);
    expect(UNDISPLAYABLE_MUSCLES.transversus_abdominis).toContain("深層");
  });

  it("三角筋は 3 分類が別々の領域を持つ（分割する）", () => {
    // サイドレイズとショルダープレスが同じ場所を光らせないための分割。
    const regions = ["deltoid_anterior", "deltoid_lateral", "deltoid_posterior"].map((id) =>
      regionOf(id as never),
    );
    expect(new Set(regions).size).toBe(3);
  });

  it("衝突しているのは 4 領域 8 分類", () => {
    // 大胸筋上下・広背筋と僧帽筋中下部・前腕 2 種・臀筋 2 種。
    // 増えたら ADR 0003 の表と判断をやり直すこと。
    const collided = BODY_REGION_IDS.filter((region) => musclesInRegion(region).length > 1);
    expect(collided).toEqual(["chest", "upper_back", "forearm", "glutes"]);
    expect(collided.flatMap(musclesInRegion)).toHaveLength(8);
  });

  it("分割が必要な領域には印が付いている", () => {
    // 流用元の SVG は front-deltoids を 1 つのパスで持っている。
    expect(BODY_REGION_IDS.filter(needsSplit)).toEqual(["shoulder_front", "shoulder_lateral"]);
  });

  it("すべての領域に流用元のパス名が記録されている", () => {
    for (const id of BODY_REGION_IDS) {
      expect(BODY_REGIONS[id].source.length, id).toBeGreaterThan(0);
    }
  });

  it("使われていない領域がない", () => {
    for (const id of BODY_REGION_IDS) {
      expect(musclesInRegion(id).length, id).toBeGreaterThan(0);
    }
  });
});
