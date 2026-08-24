/**
 * 監査のグループ化（#76）。
 *
 * 監査は上書きの判断基準そのもの（`overrides/primary-muscles.ts` の docstring）。
 * **グループから漏れたレコードは割れとして見えないので、上書きの材料そのものが欠ける。**
 */
import { describe, expect, it } from "vitest";
import { MOVEMENT_KEYWORDS, groupByKeyword, matchesKeyword } from "../../pipeline/audit-groups.ts";
import { isTargetCategory, loadUpstream } from "../../pipeline/upstream.ts";

const upstream = (await loadUpstream()).filter(isTargetCategory);

describe("キーワードの照合", () => {
  it("複数形の種目名を拾う", () => {
    expect(matchesKeyword("Wind Sprints", "sprint")).toBe(true);
    expect(matchesKeyword("Calf Raises", "raise")).toBe(true);
    expect(matchesKeyword("Barbell Curls", "curl")).toBe(true);
    expect(matchesKeyword("Dumbbell Flyes", "fly")).toBe(true);
  });

  /** 上流は同じ動作に `Flyes` と `Flye` の両方を使う。 */
  it("綴りの揺れた単数形も拾う", () => {
    expect(matchesKeyword("Incline Cable Flye", "fly")).toBe(true);
  });

  it("es を取る複数形も拾う", () => {
    expect(matchesKeyword("Chest Presses", "press")).toBe(true);
    expect(matchesKeyword("Cable Crunches", "crunch")).toBe(true);
  });

  /**
   * 単語境界を外すと `Nar(row) Stance Leg Press` が引っかかる（`audit-groups.ts`）。
   * 複数形を許すのは末尾だけで、語中の一致は拾わない。
   */
  it("語の途中で一致させない", () => {
    expect(matchesKeyword("Narrow Stance Leg Press", "row")).toBe(false);
    expect(matchesKeyword("Rowing Machine", "row")).toBe(false);
    expect(matchesKeyword("Dipping Belt", "dip")).toBe(false);
  });

  /**
   * 手で複数形を並べると、足し忘れた語が黙って漏れる。
   * `press` は単数で `s` に終わるので、そこだけ除く。
   */
  it("キーワードに複数形を手で置かない", () => {
    const plurals = MOVEMENT_KEYWORDS.filter(
      (keyword) => keyword.endsWith("s") && !keyword.endsWith("press"),
    );
    expect(plurals).toEqual([]);
  });
});

describe("上流のグループ化", () => {
  it("ウインドスプリントがスプリントのグループに入る", () => {
    const sprint = groupByKeyword(upstream).find((group) => group.keyword === "sprint");
    const names = [...(sprint?.byPrimary.values() ?? [])].flat().map((exercise) => exercise.name);
    expect(names).toContain("Wind Sprints");
  });
});
