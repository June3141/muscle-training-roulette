/**
 * 選んだ集合を実行順に並べる（design.md §5.3、ADR 0009）。
 *
 * §5.3 は 3 つのルールを挙げているが、並べ替えのキーは 2 つしかない。
 * **「先に小筋群を潰さない」は独立した機構ではなく、
 * 大筋群優先が compound 優先に勝つという優先順位そのもの。**
 *
 * 順に大筋群優先・compound 優先で並べると、
 * 「小さい筋を主働とする種目が、その筋を補助に使う種目より前に来る」状態が構造的に作れない。
 * mechanic を第 1 キーにすると作れてしまう。三頭の複合種目が胸の単関節種目より前に来る形。
 */
import { MUSCLE_IDS, type Exercise, type MuscleId } from "@mtr/data";
import { targetWeightOf } from "./coverage.ts";

/**
 * 「大筋群 → 小筋群」の 3 段階（§5.3 ルール 2）。
 *
 * **粗さは意図的。** 個々の筋の断面積を持ち込むと「三頭と三角筋のどちらが大きいか」の
 * 議論になり、出力は変わらない。順序付けに要るのは「先に潰すと後が続かない」の判別だけ。
 *
 * 数値そのものに意味はなく、大小関係だけが意味を持つ。
 */
const MUSCLE_SIZE_RANK = {
  // 大筋群。これらを主働とする種目を先に置く。
  pectoralis_major_clavicular: 0,
  pectoralis_major_sternal: 0,
  latissimus_dorsi: 0,
  erector_spinae: 0,
  quadriceps: 0,
  hamstrings: 0,
  gluteus_maximus: 0,

  // 中間。大筋群の補助に回ることが多い。
  deltoid_anterior: 1,
  deltoid_lateral: 1,
  deltoid_posterior: 1,
  trapezius_upper: 1,
  trapezius_middle_lower: 1,
  triceps_brachii: 1,
  adductors: 1,

  // 小筋群。先に潰すと大筋群の種目が成立しなくなる。
  biceps_brachii: 2,
  brachioradialis: 2,
  wrist_flexors: 2,
  gluteus_medius: 2,
  triceps_surae: 2,
  rectus_abdominis: 2,
  obliques: 2,
  transversus_abdominis: 2,
} as const satisfies Record<MuscleId, 0 | 1 | 2>;

/**
 * 主働筋。重みが最大の筋。
 *
 * 同点はタキソノミーの並び順で解く。**`muscleWeights` のキー順に依存させない。**
 * JSON のキー順は上流の記述順で決まり、意味を持たない。
 */
export function primaryMuscleOf(exercise: Exercise): MuscleId {
  let primary: MuscleId = MUSCLE_IDS[0] as MuscleId;
  let max = Number.NEGATIVE_INFINITY;
  for (const muscle of MUSCLE_IDS) {
    const weight = exercise.muscleWeights[muscle] ?? 0;
    if (weight > max) {
      max = weight;
      primary = muscle;
    }
  }
  return primary;
}

/** §5.3 ルール 1。mechanic が未設定なら compound と断定できないので後ろに置く。 */
function mechanicRankOf(exercise: Exercise): number {
  return exercise.mechanic === "compound" ? 0 : 1;
}

export function orderExercises(set: readonly Exercise[], targets: readonly MuscleId[]): Exercise[] {
  return set.toSorted(
    (a, b) =>
      MUSCLE_SIZE_RANK[primaryMuscleOf(a)] - MUSCLE_SIZE_RANK[primaryMuscleOf(b)] ||
      mechanicRankOf(a) - mechanicRankOf(b) ||
      targetWeightOf(b, targets) - targetWeightOf(a, targets) ||
      a.id.localeCompare(b.id),
  );
}
