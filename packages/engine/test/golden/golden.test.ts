import { isMuscleId } from "@mtr/data";
import { describe, expect, it } from "vitest";
import { loadDataset } from "../../src/dataset.ts";
import { formatSelection } from "../../src/format.ts";
import { selectExercises } from "../../src/select.ts";
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

const dataset = loadDataset();

describe("ゴールデンセットの実行（M3）", () => {
  for (const testCase of GOLDEN_CASES) {
    describe(`${testCase.id}: ${testCase.label}`, () => {
      const result = selectExercises(
        {
          targets: testCase.targets,
          count: testCase.count,
          allowedEquipment: testCase.allowedEquipment,
        },
        dataset,
      );
      const patterns = result.exercises.map((s) => s.exercise.movementPattern);

      it("要求した種目数がそろう（枯渇しない）", () => {
        expect(result.exercises).toHaveLength(testCase.count);
      });

      for (const group of testCase.mustContain) {
        it(`${group.join(" か ")} を含む`, () => {
          expect(patterns.some((pattern) => group.includes(pattern))).toBe(true);
        });
      }

      /**
       * **空くこと自体は異常ではないが、黙って空くのは異常。**
       * 想定外の部位が空いたときも、想定した部位が埋まったときも、ここで落ちる。
       */
      it("カバーできない部位が想定どおり", () => {
        expect(result.uncovered.toSorted()).toEqual(
          [...(testCase.knownUncovered ?? [])].toSorted(),
        );
      });

      /**
       * **差分が出ること自体は失敗ではない。** 重みを触れば出る。
       * 改善か劣化かを人間が判断し、理由を PR に書いてから更新する（CLAUDE.md）。
       */
      it("スナップショットと一致する", () => {
        expect(formatSelection(result)).toMatchSnapshot();
      });
    });
  }
});
