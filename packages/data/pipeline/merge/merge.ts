/**
 * 上流の種目を統合し、器具・片手両手を独立軸として付与する（design.md §2 Q2）。
 *
 * 手順は ADR 0002 の通り。
 *
 * 1. ベース名でグルーピングする
 * 2. `primaryMuscles` が一致するものを畳んで `equipmentOptions` に入れる
 * 3. `primaryMuscles` が異なるものは別種目のまま残す
 *
 * **主働筋は上書き適用後の値を使う。** 上流には誤りがあり（`pipeline/overrides/`）、
 * 生の値で畳むと本来同じ種目が分かれる。
 *
 * ここで作るのは中間データで、`Exercise` ではない。muscleWeights と movementPattern は
 * M2 以降で埋める。
 */
import { EQUIPMENT, LATERALITY, type Equipment, type Laterality } from "../../src/axes.ts";
import { MUSCLE_IDS, type MuscleId } from "../../src/taxonomy.ts";
import { validCombinations, type AxisInput } from "../../src/combinations.ts";
import { applyPrimaryOverride } from "../apply-overrides.ts";
import { expandMuscles } from "../mapping/expand.ts";
import type { UpstreamExercise } from "../upstream.ts";
import { resolveEquipment, resolveLaterality } from "./axes.ts";
import { normalizeBaseName } from "./base-name.ts";

export interface MergedExercise extends AxisInput {
  /** 正規化後のベース名。同じ名前でも主働筋が違えば別レコードになる。 */
  readonly baseName: string;
  /** 代表名。既定の組み合わせに対応する上流種目の名前。 */
  readonly nameEn: string;
  readonly sourceIds: readonly string[];
  /** 上流の語彙のままの主働筋。グルーピングの鍵。 */
  readonly primaryMuscles: readonly string[];
  /** タキソノミーに展開した主働筋。空ならデータセットに載せられない（expand.ts）。 */
  readonly primary: readonly MuscleId[];
  readonly secondary: readonly MuscleId[];
  readonly defaultEquipment: Equipment;
  readonly defaultLaterality: Laterality;
}

/** 上流の語彙のうち下半身の筋肉。片手/両手が片脚/両脚の意味になるかを決める。 */
const LOWER_BODY_MUSCLES = new Set([
  "quadriceps",
  "hamstrings",
  "glutes",
  "calves",
  "abductors",
  "adductors",
]);

function groupKey(exercise: UpstreamExercise): string {
  // 主働筋の順序は上流の都合なので、揃えてから鍵にする。
  return `${normalizeBaseName(exercise.name)} ${[...exercise.primaryMuscles].toSorted().join(",")}`;
}

function sortedBy<T>(order: readonly T[], values: Iterable<T>): T[] {
  const present = new Set(values);
  return order.filter((value) => present.has(value));
}

function toMerged(members: readonly UpstreamExercise[], first: UpstreamExercise): MergedExercise {
  const equipmentOptions = sortedBy(EQUIPMENT, members.map(resolveEquipment));
  const lateralityOptions = sortedBy(LATERALITY, members.map(resolveLaterality));
  const lowerBody = first.primaryMuscles.some((muscle) => LOWER_BODY_MUSCLES.has(muscle));

  // 既定値は有効な組み合わせの先頭。EQUIPMENT の宣言順が優先度、両手が片手より先。
  const preferred = validCombinations({ lowerBody, equipmentOptions, lateralityOptions })[0];
  const representative =
    members.find(
      (member) =>
        resolveEquipment(member) === preferred?.equipment &&
        resolveLaterality(member) === preferred?.laterality,
    ) ?? first;

  // 展開は上流レコードごとに違いうる（force が欠けている等）ので、和を採る。
  const expanded = members.map((member) => expandMuscles(member));
  const primary = new Set(expanded.flatMap((result) => result.primary));
  const secondary = new Set(expanded.flatMap((result) => result.secondary));
  for (const muscle of primary) secondary.delete(muscle);

  return {
    baseName: normalizeBaseName(first.name),
    nameEn: representative.name,
    sourceIds: members.map((member) => member.id),
    primaryMuscles: first.primaryMuscles,
    primary: sortedBy(MUSCLE_IDS, primary),
    secondary: sortedBy(MUSCLE_IDS, secondary),
    lowerBody,
    equipmentOptions,
    lateralityOptions,
    defaultEquipment: preferred?.equipment ?? equipmentOptions[0] ?? "other",
    defaultLaterality: preferred?.laterality ?? lateralityOptions[0] ?? "bilateral",
  };
}

export function mergeUpstream(exercises: readonly UpstreamExercise[]): MergedExercise[] {
  const groups = new Map<string, UpstreamExercise[]>();
  for (const exercise of exercises.map(applyPrimaryOverride)) {
    const key = groupKey(exercise);
    const group = groups.get(key);
    if (group) group.push(exercise);
    else groups.set(key, [exercise]);
  }

  const merged: MergedExercise[] = [];
  for (const members of groups.values()) {
    const first = members[0];
    if (first) merged.push(toMerged(members, first));
  }
  return merged;
}
