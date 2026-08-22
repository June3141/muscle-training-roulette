/**
 * テスト用の種目ファクトリ。
 *
 * 検査に効く軸だけ指定し、残りはスキーマを満たす固定値で埋める。
 *
 * **既定値は目的関数の項に効く。** `movementPattern` と `mechanic` を省略すると
 * 全種目が同じパターンの compound になり、多様性項と複合種目項が
 * 種目数だけで決まる定数になる。カバレッジ項だけを見たいテストはこれに乗る。
 */
import type { Exercise, MuscleId } from "@mtr/data";

let counter = 0;

export interface ExerciseOverrides {
  readonly id?: string;
  readonly muscleWeights: Partial<Record<MuscleId, number>>;
  readonly equipmentOptions?: readonly Exercise["defaultEquipment"][];
  readonly movementPattern?: Exercise["movementPattern"];
  readonly mechanic?: Exercise["mechanic"];
  readonly category?: Exercise["category"];
  readonly selectable?: boolean;
}

export function exercise(over: ExerciseOverrides): Exercise {
  counter += 1;
  const equipmentOptions = [...(over.equipmentOptions ?? ["barbell"])];
  return {
    id: over.id ?? `ex_${counter}`,
    sourceIds: [`Src_${counter}`],
    nameEn: `Exercise ${counter}`,
    nameJa: `種目 ${counter}`,
    force: "push",
    // `??` にすると null が既定値に潰れ、mechanic 欠損を検査できなくなる。
    mechanic: over.mechanic === undefined ? "compound" : over.mechanic,
    level: "beginner",
    category: over.category ?? "strength",
    movementPattern: over.movementPattern ?? "horizontal_press",
    equipmentOptions,
    defaultEquipment: equipmentOptions[0] ?? "barbell",
    lateralityOptions: ["bilateral"],
    defaultLaterality: "bilateral",
    selectable: over.selectable ?? true,
    muscleWeights: over.muscleWeights,
  };
}
