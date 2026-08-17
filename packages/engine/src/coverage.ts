import type { Exercise, MuscleId } from "@mtr/data";
import type { Coverage } from "./types.ts";

/**
 * 種目セットの部位カバレッジを求める。
 *
 * 各種目の muscleWeights を単純に足し合わせる。合計は種目数に等しくなる（各種目が 1.0 なので）。
 * 「1 部位に何ポイント集まったか」を見るための量であり、割合ではない。
 */
export function computeCoverage(exercises: readonly Exercise[]): Coverage {
  const coverage: Coverage = {};
  for (const exercise of exercises) {
    for (const [muscle, weight] of Object.entries(exercise.muscleWeights)) {
      const id = muscle as MuscleId;
      coverage[id] = (coverage[id] ?? 0) + (weight ?? 0);
    }
  }
  return coverage;
}

/** 指定部位に乗ったカバレッジの合計。目的関数のカバレッジ項（§5.2）。 */
export function coverageOf(coverage: Coverage, targets: readonly MuscleId[]): number {
  return targets.reduce((sum, muscle) => sum + (coverage[muscle] ?? 0), 0);
}

/**
 * カバレッジの差分（§6 の [5]）。
 *
 * 「フライ → ディップスに変更 / 三頭 +0.18, 大胸筋上部 −0.05」を出すための計算。
 * 変化のなかった部位は結果に含めない。
 */
export function diffCoverage(before: Coverage, after: Coverage): Coverage {
  const muscles = new Set([...Object.keys(before), ...Object.keys(after)] as MuscleId[]);
  const diff: Coverage = {};
  for (const muscle of muscles) {
    const delta = (after[muscle] ?? 0) - (before[muscle] ?? 0);
    if (delta !== 0) diff[muscle] = delta;
  }
  return diff;
}

/** 要求された部位のうち、カバレッジが 0 のもの。 */
export function uncoveredTargets(
  coverage: Coverage,
  targets: readonly MuscleId[],
): readonly MuscleId[] {
  return targets.filter((muscle) => (coverage[muscle] ?? 0) === 0);
}
