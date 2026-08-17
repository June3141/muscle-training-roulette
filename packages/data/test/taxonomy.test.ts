import { describe, expect, it } from "vitest";
import { MUSCLES, MUSCLE_GROUPS, MUSCLE_IDS, isMuscleId, musclesInGroup } from "../src/taxonomy.ts";

describe("筋肉タキソノミー（§4.3）", () => {
  it("三角筋が前部・中部・後部に分かれている", () => {
    expect(musclesInGroup("shoulders")).toEqual([
      "deltoid_anterior",
      "deltoid_lateral",
      "deltoid_posterior",
    ]);
  });

  it("大胸筋が上部・中下部に分かれている", () => {
    expect(musclesInGroup("chest")).toHaveLength(2);
  });

  it("部位総称を筋肉 ID として持たない", () => {
    // 「Core」のような総称は筋肉名として使わない（§4.3）
    for (const generic of ["core", "chest", "back", "shoulders", "arms", "legs", "delts"]) {
      expect(isMuscleId(generic)).toBe(false);
    }
  });

  it("すべての筋肉が既知のグループに属する", () => {
    for (const id of MUSCLE_IDS) {
      expect(Object.hasOwn(MUSCLE_GROUPS, MUSCLES[id].group)).toBe(true);
    }
  });

  it("すべてのグループに少なくとも 1 つの筋肉がある", () => {
    for (const group of Object.keys(MUSCLE_GROUPS)) {
      expect(musclesInGroup(group as keyof typeof MUSCLE_GROUPS).length).toBeGreaterThan(0);
    }
  });

  it("日本語名が重複していない", () => {
    const names = MUSCLE_IDS.map((id) => MUSCLES[id].ja);
    expect(new Set(names).size).toBe(names.length);
  });

  it("プロトタイプ汚染された文字列を筋肉 ID と誤認しない", () => {
    expect(isMuscleId("toString")).toBe(false);
    expect(isMuscleId("constructor")).toBe(false);
  });
});
