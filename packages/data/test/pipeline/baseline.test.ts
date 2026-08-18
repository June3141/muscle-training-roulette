import { describe, expect, it } from "vitest";
import { baselineWeights, resolveMechanic } from "../../pipeline/weights/baseline.ts";
import { expandMuscles } from "../../pipeline/mapping/expand.ts";
import { muscleWeightsSchema } from "../../src/schema.ts";
import { isTargetCategory, loadUpstream } from "../../pipeline/upstream.ts";

describe("mechanic の補完", () => {
  it("上流の値があればそれを使う", () => {
    expect(resolveMechanic("isolation", { primary: 1, secondary: 5 })).toBe("isolation");
    expect(resolveMechanic("compound", { primary: 1, secondary: 0 })).toBe("compound");
  });

  it("欠損なら主働筋 1 つ・補助筋 1 つ以下を単関節とみなす", () => {
    expect(resolveMechanic(null, { primary: 1, secondary: 0 })).toBe("isolation");
    expect(resolveMechanic(null, { primary: 1, secondary: 1 })).toBe("isolation");
  });

  it("欠損で主働筋が複数、または補助筋が 2 つ以上なら多関節", () => {
    expect(resolveMechanic(null, { primary: 2, secondary: 0 })).toBe("compound");
    expect(resolveMechanic(null, { primary: 1, secondary: 2 })).toBe("compound");
  });
});

describe("決定論ベースライン（§4.4 手順 1）", () => {
  it("補助筋がなければ主働筋だけで 1.0", () => {
    expect(baselineWeights({ mechanic: "isolation", primary: ["biceps_brachii"], secondary: [] })).toEqual({
      biceps_brachii: 1,
    });
  });

  it("単関節は主働筋に 0.8、残りを補助筋に配る", () => {
    expect(
      baselineWeights({
        mechanic: "isolation",
        primary: ["biceps_brachii"],
        secondary: ["brachioradialis"],
      }),
    ).toEqual({ biceps_brachii: 0.8, brachioradialis: 0.2 });
  });

  it("多関節は主働筋に 0.65、残りを補助筋に配る", () => {
    expect(
      baselineWeights({
        mechanic: "compound",
        primary: ["pectoralis_major_sternal"],
        secondary: ["triceps_brachii", "deltoid_anterior"],
      }),
    ).toEqual({
      pectoralis_major_sternal: 0.65,
      deltoid_anterior: 0.175,
      triceps_brachii: 0.175,
    });
  });

  it("主働筋が複数なら均等に分ける", () => {
    // 比率の作り分けは §4.4 の手順 3〜4（レビュー）でやる。
    expect(
      baselineWeights({
        mechanic: "compound",
        primary: ["deltoid_anterior", "deltoid_lateral"],
        secondary: [],
      }),
    ).toEqual({ deltoid_anterior: 0.5, deltoid_lateral: 0.5 });
  });

  it("主働筋は必ず補助筋より重い", () => {
    const weights = baselineWeights({
      mechanic: "compound",
      primary: ["hamstrings"],
      secondary: ["gluteus_maximus", "erector_spinae", "trapezius_upper", "wrist_flexors"],
    });
    const primary = weights.hamstrings ?? 0;
    for (const [id, value] of Object.entries(weights)) {
      if (id !== "hamstrings") expect(value, id).toBeLessThan(primary);
    }
  });

  it("主働筋が空なら重みを作らない", () => {
    expect(baselineWeights({ mechanic: "compound", primary: [], secondary: ["biceps_brachii"] })).toBe(
      null,
    );
  });

  it("同じ入力から同じ出力が出る", () => {
    const input = {
      mechanic: "compound",
      primary: ["quadriceps"],
      secondary: ["gluteus_maximus", "hamstrings", "triceps_surae"],
    } as const;
    expect(baselineWeights(input)).toEqual(baselineWeights(input));
  });
});

describe("上流データ全件", () => {
  it("主働筋を持つ全件でスキーマを通る", async () => {
    const all = (await loadUpstream()).filter(isTargetCategory);
    for (const ex of all) {
      const { primary, secondary } = expandMuscles(ex);
      if (primary.length === 0) continue;
      const weights = baselineWeights({ mechanic: ex.mechanic, primary, secondary });
      const result = muscleWeightsSchema.safeParse(weights);
      expect(result.success, `${ex.name}: ${JSON.stringify(weights)}`).toBe(true);
    }
  });

  it("手で書いた値が 1 件も混ざらない（生成が全件を覆う）", async () => {
    const all = (await loadUpstream()).filter(isTargetCategory);
    const covered = all.filter((ex) => baselineWeights({
      mechanic: ex.mechanic,
      ...expandMuscles(ex),
    }) !== null);
    expect(covered).toHaveLength(all.length - 12);
  });
});
