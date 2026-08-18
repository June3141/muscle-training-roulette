import { describe, expect, it } from "vitest";
import { buildDataset } from "../../pipeline/dataset/build.ts";
import { datasetSchema } from "../../src/schema.ts";
import { isTargetCategory, loadUpstream } from "../../pipeline/upstream.ts";

const dataset = await (async () => {
  const upstream = (await loadUpstream()).filter(isTargetCategory);
  return buildDataset(upstream);
})();

describe("データセットの組み立て", () => {
  it("datasetSchema を全件が通る", () => {
    const result = datasetSchema.safeParse(dataset.exercises);
    expect(JSON.stringify(result.error?.issues ?? []).slice(0, 400)).toBe("[]");
    expect(result.success).toBe(true);
  });

  it("主働筋が空のレコードは落とす", () => {
    // ローテーターカフ・首・ターキッシュゲットアップ。muscleWeights を作れない。
    expect(dataset.dropped.length).toBeGreaterThan(0);
    for (const entry of dataset.dropped) {
      expect(entry.reason.length, entry.baseName).toBeGreaterThan(5);
    }
  });

  it("落とした件数と残した件数の合計が統合後のレコード数と一致する", () => {
    expect(dataset.exercises.length + dataset.dropped.length).toBe(616);
  });

  it("id が一意", () => {
    const ids = dataset.exercises.map((ex) => ex.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("ベース名が衝突するものは主働筋で区別する", () => {
    // upright row は上流が shoulders と traps に割れていて 2 レコードになる。
    const uprightRows = dataset.exercises.filter((ex) => ex.id.startsWith("upright_row"));
    expect(uprightRows.map((ex) => ex.id).toSorted()).toEqual([
      "upright_row__deltoid_lateral",
      "upright_row__trapezius_upper",
    ]);
  });

  it("衝突しないものには接尾辞を付けない", () => {
    expect(dataset.exercises.some((ex) => ex.id === "bench_press")).toBe(true);
  });

  it("id に器具名も片手/両手も含まれない（ADR 0006）", () => {
    const forbidden = /barbell|dumbbell|kettlebell|smith|machine|cable|one_arm|single_leg/;
    expect(dataset.exercises.filter((ex) => forbidden.test(ex.id)).map((ex) => ex.id)).toEqual([]);
  });

  it("category を正規化する", () => {
    const categories = new Set(dataset.exercises.map((ex) => ex.category));
    expect([...categories].toSorted()).toEqual([
      "olympic_weightlifting",
      "plyometrics",
      "powerlifting",
      "strength",
      "strongman",
    ]);
  });

  it("上流 id がどのレコードにも重複しない", () => {
    const seen = new Set<string>();
    for (const ex of dataset.exercises) {
      for (const sourceId of ex.sourceIds) {
        expect(seen.has(sourceId), sourceId).toBe(false);
        seen.add(sourceId);
      }
    }
  });

  it("同じ入力から同じ出力が出る", async () => {
    const upstream = (await loadUpstream()).filter(isTargetCategory);
    expect(buildDataset(upstream).exercises).toEqual(dataset.exercises);
  });
});
