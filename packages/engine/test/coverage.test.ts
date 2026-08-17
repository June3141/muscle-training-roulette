import type { Exercise } from "@mtr/data";
import { describe, expect, it } from "vitest";
import { computeCoverage, coverageOf, diffCoverage, uncoveredTargets } from "../src/coverage.ts";

function exercise(id: string, muscleWeights: Exercise["muscleWeights"]): Exercise {
  return {
    id,
    sourceId: null,
    nameEn: id,
    nameJa: id,
    force: "push",
    mechanic: "compound",
    level: "beginner",
    category: "strength",
    movementPattern: "horizontal_press",
    equipmentOptions: ["barbell"],
    defaultEquipment: "barbell",
    lateralityOptions: ["bilateral"],
    defaultLaterality: "bilateral",
    muscleWeights,
  };
}

const bench = exercise("bench", {
  pectoralis_major_sternal: 0.45,
  pectoralis_major_clavicular: 0.15,
  triceps_brachii: 0.25,
  deltoid_anterior: 0.15,
});

const dips = exercise("dips", {
  pectoralis_major_sternal: 0.4,
  triceps_brachii: 0.43,
  deltoid_anterior: 0.17,
});

describe("computeCoverage", () => {
  it("空のセットは空のカバレッジを返す", () => {
    expect(computeCoverage([])).toEqual({});
  });

  it("種目の重みをそのまま反映する", () => {
    expect(computeCoverage([bench])).toEqual(bench.muscleWeights);
  });

  it("複数種目の重みを足し合わせる", () => {
    const coverage = computeCoverage([bench, dips]);
    expect(coverage.pectoralis_major_sternal).toBeCloseTo(0.85);
    expect(coverage.triceps_brachii).toBeCloseTo(0.68);
    expect(coverage.pectoralis_major_clavicular).toBeCloseTo(0.15);
  });

  it("合計は種目数に等しい（各種目が 1.0 に正規化されているため）", () => {
    const total = Object.values(computeCoverage([bench, dips])).reduce((a, b) => a + b, 0);
    expect(total).toBeCloseTo(2);
  });
});

describe("coverageOf", () => {
  it("指定部位のカバレッジだけを合計する", () => {
    const coverage = computeCoverage([bench]);
    expect(coverageOf(coverage, ["pectoralis_major_sternal", "triceps_brachii"])).toBeCloseTo(0.7);
  });

  it("カバーされていない部位を 0 として扱う", () => {
    expect(coverageOf(computeCoverage([bench]), ["gluteus_medius"])).toBe(0);
  });
});

describe("diffCoverage", () => {
  it("§6 の例のような差し替え差分を出す", () => {
    // フライ相当 → ディップスに変更したときの差分
    const fly = exercise("fly", {
      pectoralis_major_sternal: 0.7,
      pectoralis_major_clavicular: 0.05,
      deltoid_anterior: 0.25,
    });
    const diff = diffCoverage(computeCoverage([fly]), computeCoverage([dips]));
    expect(diff.triceps_brachii).toBeCloseTo(0.43);
    expect(diff.pectoralis_major_clavicular).toBeCloseTo(-0.05);
  });

  it("変化のない部位は結果に含めない", () => {
    const diff = diffCoverage(computeCoverage([bench]), computeCoverage([bench]));
    expect(diff).toEqual({});
  });
});

describe("uncoveredTargets", () => {
  it("カバレッジが 0 の指定部位を返す", () => {
    const coverage = computeCoverage([bench]);
    expect(uncoveredTargets(coverage, ["pectoralis_major_sternal", "gluteus_medius"])).toEqual([
      "gluteus_medius",
    ]);
  });

  it("すべてカバーされていれば空を返す", () => {
    expect(uncoveredTargets(computeCoverage([bench]), ["triceps_brachii"])).toEqual([]);
  });
});
