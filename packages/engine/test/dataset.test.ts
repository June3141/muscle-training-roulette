/**
 * 実データに対する受け入れ条件（Issue #13）。
 *
 * 固定値のフィクスチャでは多様性項が効いているかを確かめられない。
 * 候補が 100 件を超えて初めて「同じ動作パターンばかり並ぶか」が出る。
 *
 * ゴールデンセット 5 件の実行とスナップショットは #15。ここは #13 の完了条件だけを見る。
 */
import { readFileSync } from "node:fs";
import { datasetSchema, type Exercise, type MovementPattern } from "@mtr/data";
import { describe, expect, it } from "vitest";
import { primaryMuscleOf } from "../src/order.ts";
import { selectExercises } from "../src/select.ts";

const dataset = datasetSchema.parse(
  JSON.parse(readFileSync(new URL("../../../data/dataset.json", import.meta.url), "utf8")),
);

/** ゴールデンセットの `chest_only`（packages/engine/test/golden/cases.ts）と同じ要求。 */
const CHEST_ONLY = {
  targets: ["pectoralis_major_sternal", "pectoralis_major_clavicular"],
  count: 5,
} as const;

describe("chest_only を実データで解く", () => {
  const patterns = (): readonly MovementPattern[] =>
    selectExercises(CHEST_ONLY, dataset).exercises.map((s) => s.exercise.movementPattern);

  it("プレス系が 1 件以上含まれる", () => {
    expect(patterns().some((p) => p === "horizontal_press" || p === "incline_press")).toBe(true);
  });

  it("フライ系が 1 件以上含まれる", () => {
    expect(patterns()).toContain("horizontal_adduction");
  });

  /**
   * 上の 2 件はカバレッジ項の凹関数だけで満たせる。
   * **凹関数を外すと 5 種目すべてが大胸筋中下部 1.0 のフライ系で埋まり、プレスが 1 件も入らない。**
   * 凹関数がそこを崩した後、動作パターンが何種類まで散るかが多様性項の効き目になる。
   */
  it("5 種目が 4 種類以上の動作パターンに散る", () => {
    expect(new Set(patterns()).size).toBeGreaterThanOrEqual(4);
  });

  it("候補が枯渇せず 5 種目そろう", () => {
    const result = selectExercises(CHEST_ONLY, dataset);
    expect(result.exercises).toHaveLength(5);
    expect(result.uncovered).toEqual([]);
  });
});

/** ゴールデンセットの `ppl_push`（packages/engine/test/golden/cases.ts）と同じ要求。 */
const PPL_PUSH = {
  targets: [
    "pectoralis_major_sternal",
    "pectoralis_major_clavicular",
    "deltoid_anterior",
    "triceps_brachii",
  ],
  count: 6,
} as const;

const isPress = (exercise: Exercise): boolean =>
  exercise.movementPattern === "horizontal_press" ||
  exercise.movementPattern === "incline_press" ||
  exercise.movementPattern === "vertical_press";

describe("ppl_push を実データで解く", () => {
  const ordered = (): readonly Exercise[] =>
    selectExercises(PPL_PUSH, dataset).exercises.map((s) => s.exercise);

  it("プレス系が含まれる", () => {
    expect(ordered().some(isPress)).toBe(true);
  });

  /**
   * §5.3 ルール 3。三頭を先に潰すとプレスが挙がらない。
   * **単関節種目が 1 件も選ばれていないと、この検査は素通りする。**
   * だから「存在すること」を先に確かめる。
   */
  it("三頭の単関節種目が選ばれ、かつプレス系より後に来る", () => {
    const set = ordered();
    const tricepsIsolation = set.findIndex(
      (exercise) =>
        exercise.mechanic === "isolation" && primaryMuscleOf(exercise) === "triceps_brachii",
    );
    expect(tricepsIsolation).toBeGreaterThanOrEqual(0);
    expect(tricepsIsolation).toBeGreaterThan(set.findLastIndex(isPress));
  });
});
