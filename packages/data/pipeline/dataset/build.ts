/**
 * データセットを組み立てる（M2 の最終成果物）。
 *
 * 統合（ADR 0002）・部位の展開・重み・動作パターン・日本語名を 1 つの `Exercise[]` にまとめる。
 *
 * **主働筋が空のレコードは落とす。** muscleWeights を作れないので載せられない。
 * 黙って減るのが最悪なので、落とした理由を返す。
 */
import type { Exercise } from "../../src/schema.ts";
import { MUSCLES } from "../../src/taxonomy.ts";
import { mapMovementPattern } from "../mapping/movement.ts";
import { mergeUpstream, type MergedExercise } from "../merge/merge.ts";
import { toNameJa } from "../naming/name-ja.ts";
import { isSelectable } from "../selectable.ts";
import type { UpstreamExercise } from "../upstream.ts";
import { baselineWeights } from "../weights/baseline.ts";

interface DroppedExercise {
  readonly baseName: string;
  readonly nameEn: string;
  readonly reason: string;
}

export interface Dataset {
  readonly exercises: readonly Exercise[];
  readonly dropped: readonly DroppedExercise[];
}

/** 上流の表記 → スキーマの値。空白を含む値があるので素通しできない。 */
const CATEGORIES: Readonly<Record<string, Exercise["category"]>> = {
  strength: "strength",
  powerlifting: "powerlifting",
  "olympic weightlifting": "olympic_weightlifting",
  strongman: "strongman",
  plyometrics: "plyometrics",
};

const LEVELS: readonly Exercise["level"][] = ["beginner", "intermediate", "expert"];

/**
 * 統合したレコードの中で最も易しい水準を採る。
 *
 * ダンベル版が初級でバーベル版が中級なら、その種目は初級から始められる。
 */
function lowestLevel(members: readonly UpstreamExercise[]): Exercise["level"] {
  return LEVELS.find((level) => members.some((member) => member.level === level)) ?? "intermediate";
}

function firstDefined<T>(values: readonly (T | null)[]): T | null {
  return values.find((value) => value !== null) ?? null;
}

interface Naming {
  readonly id: string;
  readonly suffixJa: string;
}

/**
 * ベース名から id と日本語名の接尾辞を作る。
 *
 * 同じベース名で主働筋が違うレコードが 15 組ある（上流の primaryMuscles が割れているため）。
 * 衝突するものだけ主働筋を接尾辞に付ける（ADR 0007）。
 */
function assignNames(records: readonly MergedExercise[]): Map<MergedExercise, Naming> {
  const counts = new Map<string, number>();
  for (const record of records) {
    const base = record.baseName.replaceAll(" ", "_");
    counts.set(base, (counts.get(base) ?? 0) + 1);
  }

  const names = new Map<MergedExercise, Naming>();
  for (const record of records) {
    const base = record.baseName.replaceAll(" ", "_");
    const unique = counts.get(base) === 1;
    names.set(record, {
      id: unique ? base : `${base}__${record.primary.join("_")}`,
      // 日本語名も衝突する。3 つの「デッドリフト」が並ぶと UI で区別できない。
      suffixJa: unique ? "" : `（${record.primary.map((id) => MUSCLES[id].ja).join("・")}）`,
    });
  }
  return names;
}

function toExercise(
  record: MergedExercise,
  naming: Naming,
  members: readonly UpstreamExercise[],
): Exercise | DroppedExercise {
  const weights = baselineWeights({
    mechanic: firstDefined(members.map((member) => member.mechanic)),
    primary: record.primary,
    secondary: record.secondary,
  });
  if (weights === null) {
    return {
      baseName: record.baseName,
      nameEn: record.nameEn,
      reason: "タキソノミーに写せる主働筋がない（ローテーターカフ・首・全身種目）",
    };
  }

  const { nameJa } = toNameJa(record.baseName);
  const category = members.map((member) => CATEGORIES[member.category]).find(Boolean);
  return {
    id: naming.id,
    sourceIds: [...record.sourceIds],
    nameEn: record.nameEn,
    nameJa: `${nameJa}${naming.suffixJa}`,
    force: firstDefined(members.map((member) => member.force)) as Exercise["force"],
    mechanic: firstDefined(members.map((member) => member.mechanic)) as Exercise["mechanic"],
    level: lowestLevel(members),
    category: category ?? "strength",
    movementPattern: mapMovementPattern(record.baseName).pattern,
    equipmentOptions: [...record.equipmentOptions],
    defaultEquipment: record.defaultEquipment,
    lateralityOptions: [...record.lateralityOptions],
    defaultLaterality: record.defaultLaterality,
    // 1 件でも候補に出せるものがあれば残す。統合前の判断なので id 単位で見る。
    selectable: record.sourceIds.some((sourceId) => isSelectable(sourceId)),
    muscleWeights: weights,
  };
}

function isDropped(value: Exercise | DroppedExercise): value is DroppedExercise {
  return "reason" in value;
}

export function buildDataset(upstream: readonly UpstreamExercise[]): Dataset {
  const byId = new Map(upstream.map((exercise) => [exercise.id, exercise]));
  const records = mergeUpstream(upstream);
  const names = assignNames(records);

  const exercises: Exercise[] = [];
  const dropped: DroppedExercise[] = [];
  for (const record of records) {
    const members = record.sourceIds
      .map((sourceId) => byId.get(sourceId))
      .filter((m) => m !== undefined);
    const naming = names.get(record) ?? { id: record.baseName, suffixJa: "" };
    const result = toExercise(record, naming, members);
    if (isDropped(result)) dropped.push(result);
    else exercises.push(result);
  }
  return { exercises, dropped };
}
