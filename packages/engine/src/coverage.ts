import type { Exercise, MuscleId } from "@mtr/data";
import type { Coverage } from "./types.ts";

/**
 * 種目セットの部位カバレッジを求める。
 *
 * 各種目の muscleWeights を単純に足し合わせる。合計は種目数に等しくなる（各種目が 1.0 なので）。
 * 「1 部位に何ポイント集まったか」を見るための量であり、割合ではない。
 *
 * ## 単位について
 *
 * 値は **種目数換算**。6 種目のセットで「大胸筋中下部 1.8」なら
 * 「6 種目のうち 1.8 種目分が大胸筋中下部に向いている」という意味になる。
 *
 * **セット数やボリュームではない。** ベンチプレスとサイドレイズは
 * どちらも 1 種目 = 1.0 として扱われる（§3 でセット数は扱わないと決めているため）。
 *
 * ## 正規化しない理由
 *
 * **内部は絶対値で持ち、正規化は表示側の責務にする。**
 *
 * - 人体図の濃淡は最大値を 1 とする相対値が要る
 * - バーチャートは絶対値でも成立する
 * - 差し替え差分（§6 の「三頭 +0.18」）は絶対値の差でないと意味を持たない
 *
 * 表示ごとに必要な目盛りが違うので、ここで正規化すると情報が失われる。
 * 目盛りの最終決定は M4 の入口で行う（Issue「カバレッジ可視化を作る」）。
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

/** 1 種目が指定部位に乗せている重みの合計。候補の絞り込みと順序付けの同点解消に使う。 */
export function targetWeightOf(exercise: Exercise, targets: readonly MuscleId[]): number {
  return targets.reduce((sum, muscle) => sum + (exercise.muscleWeights[muscle] ?? 0), 0);
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
