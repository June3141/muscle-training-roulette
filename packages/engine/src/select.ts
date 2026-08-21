/**
 * 指定部位を最もよくカバーする N 種目を選ぶ（design.md §5.1、ADR 0008）。
 *
 * 目的関数に凹関数が入って劣モジュラになったので、**限界利得が選択済みの集合に依存する。**
 * 一度並べ替えるだけでは足りず、1 種目ずつ足し直す反復が要る。
 * ここで初めて貪欲法が近似（(1 − 1/e) 保証）になる。
 *
 * 貪欲法の後に 1-swap を回す。**1 手目の取りこぼしは後続の手では回収できない。**
 * 厳密解は入れない。目的関数が最適解の近傍で平坦で、詰めても出力の質が変わらない（ADR 0008）。
 *
 * 選んだ集合は最後に実行順へ並べ替える（§5.3、order.ts）。
 * **貪欲法が採った順は「目的関数をどう伸ばしたか」であって、実行に適した順ではない。**
 */
import type { Equipment, Exercise, MuscleId } from "@mtr/data";
import { computeCoverage, targetWeightOf, uncoveredTargets } from "./coverage.ts";
import { objective } from "./objective.ts";
import { orderExercises } from "./order.ts";
import type { SelectedExercise, SelectionRequest, SelectionResult } from "./types.ts";

/**
 * 改善とみなす下限。
 *
 * **同点を改善と数えると、入れ替えが延々と続いて出力が入力順に依存する。**
 * 厳密な不等号だけでは浮動小数の丸めで同点が同点にならない。
 */
const IMPROVEMENT_EPSILON = 1e-12;

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

/** 許可された器具のどれかで実行できるか。空・未指定なら制限なし。 */
export function allowsEquipment(
  exercise: Exercise,
  allowed: readonly Equipment[] | undefined,
): boolean {
  if (allowed === undefined || allowed.length === 0) return true;
  return exercise.equipmentOptions.some((option) => allowed.includes(option));
}

function candidatesOf(request: SelectionRequest, dataset: readonly Exercise[]): Exercise[] {
  return dataset.filter(
    (exercise) =>
      exercise.selectable &&
      targetWeightOf(exercise, request.targets) > 0 &&
      allowsEquipment(exercise, request.allowedEquipment),
  );
}

/** 目的関数を最も伸ばす 1 件。同点なら候補の並び順で先に来た方（データセット順は決定論的）。 */
function bestAddition(
  chosen: readonly Exercise[],
  pool: readonly Exercise[],
  targets: readonly MuscleId[],
): Exercise | undefined {
  let best: Exercise | undefined;
  let bestValue = Number.NEGATIVE_INFINITY;
  for (const candidate of pool) {
    if (chosen.includes(candidate)) continue;
    const value = objective([...chosen, candidate], targets);
    if (value > bestValue + IMPROVEMENT_EPSILON) {
      bestValue = value;
      best = candidate;
    }
  }
  return best;
}

function greedy(
  pool: readonly Exercise[],
  targets: readonly MuscleId[],
  count: number,
): Exercise[] {
  const chosen: Exercise[] = [];
  while (chosen.length < count) {
    const next = bestAddition(chosen, pool, targets);
    if (next === undefined) break;
    chosen.push(next);
  }
  return chosen;
}

/** 1 件だけ入れ替えて最も良くなる集合。`value` を超えるものが無ければ undefined。 */
function bestSwap(
  current: readonly Exercise[],
  pool: readonly Exercise[],
  targets: readonly MuscleId[],
  value: number,
): { readonly set: Exercise[]; readonly value: number } | undefined {
  let best: Exercise[] | undefined;
  let bestValue = value;
  for (let index = 0; index < current.length; index += 1) {
    for (const candidate of pool) {
      if (current.includes(candidate)) continue;
      const next = [...current];
      next[index] = candidate;
      const nextValue = objective(next, targets);
      if (nextValue > bestValue + IMPROVEMENT_EPSILON) {
        bestValue = nextValue;
        best = next;
      }
    }
  }
  return best === undefined ? undefined : { set: best, value: bestValue };
}

/** 選択済み 1 件を候補 1 件と入れ替え、改善する限り繰り返す。 */
function improveBySwap(
  chosen: readonly Exercise[],
  pool: readonly Exercise[],
  targets: readonly MuscleId[],
): Exercise[] {
  let current = [...chosen];
  let swap = bestSwap(current, pool, targets, objective(current, targets));
  while (swap !== undefined) {
    current = swap.set;
    swap = bestSwap(current, pool, targets, swap.value);
  }
  return current;
}

/**
 * 種目の集合を実行順に並べて結果にする。
 *
 * **`SelectionResult.exercises` は実行順という契約なので、集合から結果を作る経路を 1 つにする。**
 * 差し替え（cli.ts）も同じ経路を通す。
 */
export function resultOf(chosen: readonly Exercise[], request: SelectionRequest): SelectionResult {
  const ordered = orderExercises(chosen, request.targets);
  const exercises: readonly SelectedExercise[] = ordered.map((exercise) => ({
    exercise,
    equipment: equipmentFor(exercise, request.allowedEquipment),
    laterality: exercise.defaultLaterality,
  }));
  const coverage = computeCoverage(ordered);
  return { exercises, coverage, uncovered: uncoveredTargets(coverage, request.targets) };
}

export function selectExercises(
  request: SelectionRequest,
  dataset: readonly Exercise[],
): SelectionResult {
  const pool = candidatesOf(request, dataset);
  const greedyChoice = greedy(pool, request.targets, Math.max(0, request.count));
  return resultOf(improveBySwap(greedyChoice, pool, request.targets), request);
}
