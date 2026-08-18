/**
 * 指定部位を最もよくカバーする N 種目を選ぶ（design.md §5.1）。
 *
 * **この段階の目的関数はモジュラなので、貪欲法は上位 k 件の選択と完全に一致する。**
 * f(S) = Σ_{e∈S}（e の対象筋の重み和）で種目間に相互作用がなく、
 * 限界利得が選択済みの集合に依存しない。だから反復せず一度並べ替えれば足りる。
 *
 * 反復する貪欲法に書き換える必要が出るのは、#13 で凹関数（同一筋への集中の減点）や
 * 多様性項を入れて劣モジュラになったとき。**そこで初めて (1 − 1/e) の近似の話になる。**
 * 先に反復で書いても今は同じ結果しか出ないので、差が出る時点まで待つ。
 *
 * 順序付け（§5.3）は #14。ここでは選んだ順で返す。
 */
import type { Equipment, Exercise, MuscleId } from "@mtr/data";
import { computeCoverage, uncoveredTargets } from "./coverage.ts";
import type { SelectedExercise, SelectionRequest, SelectionResult } from "./types.ts";

/** 対象筋に乗っている重みの合計。目的関数のカバレッジ項（§5.2）。 */
function scoreOf(exercise: Exercise, targets: readonly MuscleId[]): number {
  return targets.reduce((sum, muscle) => sum + (exercise.muscleWeights[muscle] ?? 0), 0);
}

/**
 * 実際に使う器具を決める。
 *
 * 既定の器具が許可されているならそれを使う。器具は選択後に切り替えられる軸なので（§6 の [4]）、
 * ここでの決定は初期値でしかない。
 */
function equipmentFor(exercise: Exercise, allowed: readonly Equipment[] | undefined): Equipment {
  if (allowed === undefined || allowed.length === 0) return exercise.defaultEquipment;
  if (allowed.includes(exercise.defaultEquipment)) return exercise.defaultEquipment;
  return (
    exercise.equipmentOptions.find((option) => allowed.includes(option)) ??
    exercise.defaultEquipment
  );
}

function candidatesOf(request: SelectionRequest, dataset: readonly Exercise[]): Exercise[] {
  const allowed = request.allowedEquipment;
  return dataset.filter(
    (exercise) =>
      exercise.selectable &&
      scoreOf(exercise, request.targets) > 0 &&
      (allowed === undefined ||
        allowed.length === 0 ||
        exercise.equipmentOptions.some((option) => allowed.includes(option))),
  );
}

export function selectExercises(
  request: SelectionRequest,
  dataset: readonly Exercise[],
): SelectionResult {
  const pool = candidatesOf(request, dataset);
  // 対象筋への寄与が同点なら先に来た方を採る。データセットの順序が決定論的なので出力も決まる。
  pool.sort((a, b) => scoreOf(b, request.targets) - scoreOf(a, request.targets));

  const chosen = pool.slice(0, Math.max(0, request.count));
  const exercises: readonly SelectedExercise[] = chosen.map((exercise) => ({
    exercise,
    equipment: equipmentFor(exercise, request.allowedEquipment),
    laterality: exercise.defaultLaterality,
  }));

  const coverage = computeCoverage(chosen);
  return { exercises, coverage, uncovered: uncoveredTargets(coverage, request.targets) };
}
