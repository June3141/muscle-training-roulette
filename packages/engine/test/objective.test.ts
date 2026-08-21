/**
 * 目的関数の各項（design.md §5.2、Issue #13）。
 *
 * 項ごとに単体で検査する。組み合わせた結果どの種目が選ばれるかは select.test.ts。
 *
 * **どの項も単調非減少であることを検査している。** 減点として書くと単調性が崩れ、
 * 貪欲法の近似保証の前提（単調劣モジュラ）が消える（ADR 0008 決定 3）。
 */
import { describe, expect, it } from "vitest";
import { OBJECTIVE_WEIGHTS, coverageTerm, diversityTerm, objective } from "../src/objective.ts";
import { exercise } from "./fixtures.ts";

describe("coverageTerm", () => {
  it("何も選ばなければ 0", () => {
    expect(coverageTerm([], ["quadriceps"])).toBe(0);
  });

  it("対象筋を 1.0 でカバーすると 1", () => {
    const quad = exercise({ muscleWeights: { quadriceps: 1 } });
    expect(coverageTerm([quad], ["quadriceps"])).toBe(1);
  });

  it("対象に入っていない筋は数えない", () => {
    const half = exercise({ muscleWeights: { quadriceps: 0.5, triceps_brachii: 0.5 } });
    expect(coverageTerm([half], ["quadriceps"])).toBeCloseTo(Math.SQRT1_2, 10);
  });

  it("筋ごとに凹関数を噛ませるので、合計ではなく平方根の和になる", () => {
    const split = exercise({ muscleWeights: { quadriceps: 0.75, hamstrings: 0.25 } });
    expect(coverageTerm([split], ["quadriceps", "hamstrings"])).toBeCloseTo(
      Math.sqrt(0.75) + Math.sqrt(0.25),
      10,
    );
  });

  it("同一筋への集中は、同じ重み合計を分散させた場合より低く評価される", () => {
    const concentrated = Array.from({ length: 4 }, () =>
      exercise({ muscleWeights: { quadriceps: 1 } }),
    );
    const spread = (
      ["quadriceps", "hamstrings", "gluteus_maximus", "triceps_brachii"] as const
    ).map((muscle) => exercise({ muscleWeights: { [muscle]: 1 } }));
    const targets = ["quadriceps", "hamstrings", "gluteus_maximus", "triceps_brachii"] as const;

    expect(coverageTerm(concentrated, targets)).toBe(2);
    expect(coverageTerm(spread, targets)).toBe(4);
  });

  /**
   * **プライオメトリクスに「珍しいパターン」の加点を払わない。**
   * `throw` と `jump` はプライオメトリクスしか持たないので、
   * 数えると多様性項が必ずそこへ手を伸ばす。
   */
  it("プライオメトリクスは種類数に数えない", () => {
    const press = exercise({
      muscleWeights: { quadriceps: 1 },
      movementPattern: "horizontal_press",
    });
    const slam = exercise({
      muscleWeights: { quadriceps: 1 },
      movementPattern: "throw",
      category: "plyometrics",
    });
    expect(diversityTerm([press, slam])).toBe(1);
  });

  it("プライオメトリクス以外のカテゴリは数える", () => {
    // olympic_weightlifting と strongman には一般的な筋力種目が混ざっている
    // （docs/data-survey.md）。カテゴリ一律では切らない。
    const clean = exercise({
      muscleWeights: { quadriceps: 1 },
      movementPattern: "hinge",
      category: "olympic_weightlifting",
    });
    const carry = exercise({
      muscleWeights: { quadriceps: 1 },
      movementPattern: "carry",
      category: "strongman",
    });
    expect(diversityTerm([clean, carry])).toBe(2);
  });

  it("種目を足しても減らない（単調非減少）", () => {
    const a = exercise({ muscleWeights: { quadriceps: 1 } });
    const b = exercise({ muscleWeights: { triceps_brachii: 1 } });
    expect(coverageTerm([a, b], ["quadriceps"])).toBeGreaterThanOrEqual(
      coverageTerm([a], ["quadriceps"]),
    );
  });
});

describe("diversityTerm", () => {
  it("何も選ばなければ 0", () => {
    expect(diversityTerm([])).toBe(0);
  });

  it("動作パターンの種類数を数える", () => {
    const set = (["horizontal_press", "incline_press", "horizontal_adduction"] as const).map(
      (movementPattern) => exercise({ muscleWeights: { quadriceps: 1 }, movementPattern }),
    );
    expect(diversityTerm(set)).toBe(3);
  });

  it("同じ動作パターンは重複して数えない", () => {
    const set = Array.from({ length: 3 }, () =>
      exercise({ muscleWeights: { quadriceps: 1 }, movementPattern: "horizontal_press" }),
    );
    expect(diversityTerm(set)).toBe(1);
  });

  it("種目を足しても減らない（単調非減少）", () => {
    const press = exercise({
      muscleWeights: { quadriceps: 1 },
      movementPattern: "horizontal_press",
    });
    const same = exercise({
      muscleWeights: { quadriceps: 1 },
      movementPattern: "horizontal_press",
    });
    expect(diversityTerm([press, same])).toBeGreaterThanOrEqual(diversityTerm([press]));
  });
});

describe("objective", () => {
  it("2 項の係数付き和になる", () => {
    const set = [
      exercise({
        muscleWeights: { quadriceps: 1 },
        movementPattern: "squat",
        mechanic: "compound",
      }),
      exercise({
        muscleWeights: { hamstrings: 1 },
        movementPattern: "hinge",
        mechanic: "isolation",
      }),
    ];
    const targets = ["quadriceps", "hamstrings"] as const;

    expect(objective(set, targets)).toBeCloseTo(
      OBJECTIVE_WEIGHTS.coverage * coverageTerm(set, targets) +
        OBJECTIVE_WEIGHTS.diversity * diversityTerm(set),
      10,
    );
  });

  it("カバレッジ項が基準なので係数は 1", () => {
    expect(OBJECTIVE_WEIGHTS.coverage).toBe(1);
  });

  it("多様性は加点なので係数が正", () => {
    expect(OBJECTIVE_WEIGHTS.diversity).toBeGreaterThan(0);
  });

  /**
   * 複合種目優先は §5.3 の順序付けが担う（ADR 0009）。
   * **目的関数に戻すと単関節種目が候補から押し出される。**
   */
  it("mechanic は目的関数に影響しない", () => {
    const compound = [exercise({ muscleWeights: { quadriceps: 1 }, mechanic: "compound" })];
    const isolation = [exercise({ muscleWeights: { quadriceps: 1 }, mechanic: "isolation" })];
    expect(objective(compound, ["quadriceps"])).toBe(objective(isolation, ["quadriceps"]));
  });
});
