import { isMuscleId } from "@mtr/data";
import { describe, expect, it } from "vitest";
import { GOLDEN_CASES } from "./cases.ts";

describe("ゴールデンセットの定義", () => {
  it("id が一意", () => {
    const ids = GOLDEN_CASES.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("targets がすべて有効な筋肉 ID", () => {
    for (const testCase of GOLDEN_CASES) {
      for (const muscle of testCase.targets) {
        expect(isMuscleId(muscle), `${testCase.id}: ${muscle}`).toBe(true);
      }
    }
  });

  it("count が 1〜10 の範囲（§3）", () => {
    for (const testCase of GOLDEN_CASES) {
      expect(testCase.count).toBeGreaterThanOrEqual(1);
      expect(testCase.count).toBeLessThanOrEqual(10);
    }
  });

  it("knownUncovered が targets の部分集合", () => {
    for (const testCase of GOLDEN_CASES) {
      for (const muscle of testCase.knownUncovered ?? []) {
        expect(testCase.targets, testCase.id).toContain(muscle);
      }
    }
  });
});

describe("ゴールデンセットの実行（M3）", () => {
  // 選択エンジン実装後、それぞれ「mustContain を満たす」ことと
  // 「出力セットがスナップショットと一致する」ことを検証する。
  // スナップショットの更新には PR 本文での理由の記載が必要（CONTRIBUTING.md）。
  for (const testCase of GOLDEN_CASES) {
    it.todo(`${testCase.id}: ${testCase.label}`);
  }
});
