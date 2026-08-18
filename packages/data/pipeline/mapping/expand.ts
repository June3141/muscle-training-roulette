/**
 * 上流の部位（17 語）をタキソノミー（22 分類）に展開する（design.md §4.4 の手順 2）。
 *
 * M1 で部位ごとに書いた写像の**入口**。呼ぶ側が「肩なら shoulders.ts」を知らずに済むようにする。
 *
 * 展開は種目ごとに独立で、上流の並び順に依存しない。
 * **同じ入力から必ず同じ出力**が出る（M2 のベースライン生成が決定論であるための前提）。
 */
import type { MuscleId } from "../../src/taxonomy.ts";
import { MUSCLE_IDS } from "../../src/taxonomy.ts";
import type { UpstreamExercise } from "../upstream.ts";
import { mapAbdominals } from "./abdominals.ts";
import { mapBack } from "./back.ts";
import { mapChest } from "./chest.ts";
import { mapForearms } from "./forearms.ts";
import { addHipStabilizers } from "./hip-stabilizers.ts";
import { isUnmappable, mapShoulders } from "./shoulders.ts";

interface UnmappedMuscle {
  readonly muscle: string;
  readonly reason: string;
}

export interface ExpandedMuscles {
  readonly primary: readonly MuscleId[];
  readonly secondary: readonly MuscleId[];
  /** タキソノミーに写せなかった上流の部位。**黙って落とさない。** */
  readonly unmapped: readonly UnmappedMuscle[];
}

/** 1 対 1 で写せる部位。判断が要らないもの。 */
const DIRECT: Readonly<Record<string, MuscleId>> = {
  biceps: "biceps_brachii",
  triceps: "triceps_brachii",
  quadriceps: "quadriceps",
  hamstrings: "hamstrings",
  glutes: "gluteus_maximus",
  calves: "triceps_surae",
  abductors: "gluteus_medius",
  adductors: "adductors",
};

const BACK_MUSCLES = new Set(["lats", "traps", "middle back", "lower back"]);

type ExpandResult = { readonly muscles: readonly MuscleId[] } | { readonly reason: string };

function expandOne(muscle: string, exercise: UpstreamExercise): ExpandResult {
  const direct = DIRECT[muscle];
  if (direct) return { muscles: [direct] };

  if (muscle === "shoulders") {
    const mapping = mapShoulders(exercise);
    if (mapping === null) return { reason: "肩の判別ルールに当たらない（shoulders.ts）" };
    return isUnmappable(mapping) ? { reason: mapping.reason } : mapping;
  }
  if (muscle === "chest") return mapChest(exercise);
  if (muscle === "abdominals") {
    return mapAbdominals(exercise) ?? { reason: "腹部の判別ルールに当たらない（abdominals.ts）" };
  }
  if (BACK_MUSCLES.has(muscle)) {
    return mapBack(muscle, exercise) ?? { reason: "背中の判別ルールに当たらない（back.ts）" };
  }
  if (muscle === "forearms") return mapForearms(exercise);
  if (muscle === "neck") return { reason: "首はタキソノミーの対象外（ADR 0005）" };
  return { reason: `上流の語彙にない部位: ${muscle}` };
}

/** タキソノミーの宣言順に並べ替える。上流の並び順が出力に漏れないようにする。 */
function canonical(muscles: Iterable<MuscleId>): MuscleId[] {
  const present = new Set(muscles);
  return MUSCLE_IDS.filter((id) => present.has(id));
}

/** 部位の並びを 1 本ずつ展開する。写せなかったものは理由付きで返す。 */
function expandList(
  muscles: readonly string[],
  exercise: UpstreamExercise,
): { readonly ids: MuscleId[]; readonly unmapped: UnmappedMuscle[] } {
  const ids: MuscleId[] = [];
  const unmapped: UnmappedMuscle[] = [];
  for (const muscle of muscles) {
    const result = expandOne(muscle, exercise);
    if ("reason" in result) unmapped.push({ muscle, reason: result.reason });
    else ids.push(...result.muscles);
  }
  return { ids, unmapped };
}

export function expandMuscles(exercise: UpstreamExercise): ExpandedMuscles {
  const primaryResult = expandList(exercise.primaryMuscles, exercise);
  const secondaryResult = expandList(exercise.secondaryMuscles, exercise);

  const primary = new Set(primaryResult.ids);
  // 上流が記録していない股関節の安定筋を補う（docs/data-survey.md）。
  const stabilizers = addHipStabilizers(exercise)?.muscles ?? [];
  const secondary = new Set([...secondaryResult.ids, ...stabilizers]);
  for (const id of primary) secondary.delete(id);

  return {
    primary: canonical(primary),
    secondary: canonical(secondary),
    unmapped: [...primaryResult.unmapped, ...secondaryResult.unmapped],
  };
}
