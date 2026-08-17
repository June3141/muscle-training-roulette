/**
 * 拡張種目スキーマ（design.md §4.2）。
 *
 * free-exercise-db の生データに、日本語名・細分化した muscleWeights・
 * 独立軸としての器具/片手両手を足したもの。
 */
import { z } from "zod";
import { MUSCLE_IDS } from "./taxonomy.ts";

/** muscleWeights の合計が 1.0 とみなせる許容誤差。 */
export const WEIGHT_SUM_TOLERANCE = 1e-6;

/**
 * 器具。free-exercise-db の値を正規化し、`smith` を独自に足している。
 * 器具は重みに影響しない独立軸として扱う（ADR 0002）。
 */
export const EQUIPMENT = [
  "barbell",
  "dumbbell",
  "kettlebell",
  "ez_curl_bar",
  "smith",
  "machine",
  "cable",
  "bands",
  "body_only",
  "exercise_ball",
  "medicine_ball",
  "foam_roll",
  "other",
] as const;

/**
 * 動作パターン。多様性制約（§5.2）で重複を減点するために使う。
 *
 * 暫定リスト。確定は M1（#taxonomy）で行う。
 * ここが粗いと「胸 5 種目が全部水平プレス」を検出できない。
 */
export const MOVEMENT_PATTERNS = [
  "horizontal_press",
  "incline_press",
  "vertical_press",
  "horizontal_pull",
  "vertical_pull",
  /** フライ・ペックデック等の水平内転。プレスと区別しないと §7「胸のみ」ケースを判定できない。 */
  "horizontal_adduction",
  "shoulder_raise",
  "elbow_flexion",
  "elbow_extension",
  "squat",
  "hinge",
  "lunge",
  "leg_isolation",
  "calf_raise",
  "trunk_flexion",
  "trunk_rotation",
  "trunk_antiextension",
  "carry",
  "other",
] as const;

export const LATERALITY = ["bilateral", "unilateral"] as const;
export const FORCE = ["push", "pull", "static"] as const;
export const MECHANIC = ["compound", "isolation"] as const;
export const LEVEL = ["beginner", "intermediate", "expert"] as const;
export const CATEGORY = [
  "strength",
  "powerlifting",
  "olympic_weightlifting",
  "strongman",
  "plyometrics",
  "stretching",
  "cardio",
] as const;

/**
 * すべての筋肉を列挙する必要はないので partialRecord。
 * ただしタキソノミーに存在しないキーは弾く。
 */
export const muscleWeightsSchema = z
  .partialRecord(z.enum(MUSCLE_IDS), z.number().gt(0).lte(1))
  .superRefine((weights, ctx) => {
    if (Object.keys(weights).length === 0) {
      ctx.addIssue({ code: "custom", message: "muscleWeights が空です" });
      return;
    }
    const sum = sumOf(weights);
    if (Math.abs(sum - 1) > WEIGHT_SUM_TOLERANCE) {
      ctx.addIssue({
        code: "custom",
        message: `muscleWeights の合計が 1.0 になっていません: ${sum}`,
      });
    }
  });

function sumOf(weights: Partial<Record<string, number>>): number {
  return Object.values(weights).reduce<number>((a, b) => a + (b ?? 0), 0);
}

export const exerciseSchema = z
  .object({
    /** 独自 id。命名規則は M0（#4）で確定する。 */
    id: z.string().regex(/^[a-z0-9_]+$/, "id は snake_case の英数字のみ"),
    /** free-exercise-db 側の id。上流の更新に追随するために保持する。 */
    sourceId: z.string().nullable(),

    nameEn: z.string().min(1),
    nameJa: z.string().min(1),

    force: z.enum(FORCE).nullable(),
    mechanic: z.enum(MECHANIC).nullable(),
    level: z.enum(LEVEL),
    category: z.enum(CATEGORY),
    movementPattern: z.enum(MOVEMENT_PATTERNS),

    equipmentOptions: z.array(z.enum(EQUIPMENT)).nonempty(),
    defaultEquipment: z.enum(EQUIPMENT),
    lateralityOptions: z.array(z.enum(LATERALITY)).nonempty(),
    defaultLaterality: z.enum(LATERALITY),

    /**
     * 選択エンジンの候補プールに出すか。
     *
     * false でもデータセットには含まれ、muscleWeights も持つ。
     * アトラスストーンのような特殊器具種目や、Snatch Balance のような
     * 純粋な技術種目を候補から外すために使う。
     *
     * **カテゴリ単位ではなく種目単位で判断する。** カテゴリで切ると
     * 一般的な筋力種目まで落ちる（docs/data-survey.md の「対象範囲」を参照）。
     */
    selectable: z.boolean().default(true),

    muscleWeights: muscleWeightsSchema,
  })
  .refine((ex) => ex.equipmentOptions.includes(ex.defaultEquipment), {
    message: "defaultEquipment が equipmentOptions に含まれていません",
    path: ["defaultEquipment"],
  })
  .refine((ex) => ex.lateralityOptions.includes(ex.defaultLaterality), {
    message: "defaultLaterality が lateralityOptions に含まれていません",
    path: ["defaultLaterality"],
  });

export type Exercise = z.infer<typeof exerciseSchema>;
export type Equipment = (typeof EQUIPMENT)[number];
export type MovementPattern = (typeof MOVEMENT_PATTERNS)[number];
export type Laterality = (typeof LATERALITY)[number];

export const datasetSchema = z.array(exerciseSchema).superRefine((list, ctx) => {
  const seen = new Set<string>();
  for (const [index, ex] of list.entries()) {
    if (seen.has(ex.id)) {
      ctx.addIssue({
        code: "custom",
        message: `id が重複しています: ${ex.id}`,
        path: [index, "id"],
      });
    }
    seen.add(ex.id);
  }
});
