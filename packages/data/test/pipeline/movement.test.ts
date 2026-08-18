import { describe, expect, it } from "vitest";
import { expandMuscles } from "../../pipeline/mapping/expand.ts";
import { mapMovementPattern } from "../../pipeline/mapping/movement.ts";
import { mergeUpstream } from "../../pipeline/merge/merge.ts";
import { isTargetCategory, loadUpstream } from "../../pipeline/upstream.ts";

function patternOf(baseName: string): string {
  return mapMovementPattern(baseName).pattern;
}

describe("動作パターンの判定（§5.2）", () => {
  it("押す動作を面で分ける", () => {
    expect(patternOf("bench press")).toBe("horizontal_press");
    expect(patternOf("incline bench press")).toBe("incline_press");
    expect(patternOf("shoulder press")).toBe("vertical_press");
  });

  it("フライとプレスを分ける", () => {
    // ここを分けないと §7 の「胸のみ」ケースで水平プレス 5 種目が並ぶ。
    expect(patternOf("dumbbell flye")).toBe("horizontal_adduction");
    expect(patternOf("crossover")).toBe("horizontal_adduction");
  });

  it("引く動作を面で分ける", () => {
    expect(patternOf("bent over row")).toBe("horizontal_pull");
    expect(patternOf("wide grip lat pulldown")).toBe("vertical_pull");
  });

  it("下半身を股関節優位と膝関節優位で分ける", () => {
    expect(patternOf("deadlift")).toBe("hinge");
    expect(patternOf("squat")).toBe("squat");
    expect(patternOf("walking lunge")).toBe("lunge");
  });

  it("手首と肘を分ける", () => {
    // リストカールは肘を曲げない。elbow_flexion に入れると多様性制約が誤作動する。
    expect(patternOf("seated palm up wrist curl")).toBe("wrist_flexion");
    expect(patternOf("preacher curl")).toBe("elbow_flexion");
  });

  it("跳ぶ動作と投げる動作を分ける", () => {
    expect(patternOf("box jump")).toBe("jump");
    expect(patternOf("medicine ball slam")).toBe("throw");
  });

  it("判別できないものは理由が残る", () => {
    const result = mapMovementPattern("seated head harness neck resistance");
    expect(result.pattern).toBe("other");
    expect(result.rule).toContain("当たらない");
  });

  it("当たったルールが分かる", () => {
    expect(mapMovementPattern("bench press").rule.length).toBeGreaterThan(0);
  });
});

describe("上流データ全件", () => {
  it("データセットに載るレコードで other が出ない", async () => {
    // other が増えると §5.2 の多様性制約が効かなくなる。
    const all = (await loadUpstream()).filter(isTargetCategory);
    // 主働筋が空のレコードはデータセットに載らない（expand.ts の 12 件）。
    const kept = new Set(all.filter((ex) => expandMuscles(ex).primary.length > 0).map((ex) => ex.id));
    const others = mergeUpstream(all)
      .filter((record) => record.sourceIds.some((id) => kept.has(id)))
      .filter((record) => mapMovementPattern(record.baseName).pattern === "other");
    expect(others.map((record) => record.baseName)).toEqual([]);
  });

  it("同じ入力から同じ出力が出る", async () => {
    const all = (await loadUpstream()).filter(isTargetCategory);
    for (const record of mergeUpstream(all)) {
      expect(mapMovementPattern(record.baseName)).toEqual(mapMovementPattern(record.baseName));
    }
  });
});
