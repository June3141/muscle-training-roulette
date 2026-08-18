/**
 * 拡張種目スキーマ（design.md §4.2）。
 *
 * free-exercise-db の生データに、日本語名・細分化した muscleWeights・
 * 独立軸としての器具/片手両手を足したもの。
 */
import { z } from "zod";
import {
  CATEGORY,
  EQUIPMENT,
  FORCE,
  LATERALITY,
  LEVEL,
  MECHANIC,
  MOVEMENT_PATTERNS,
} from "./axes.ts";
import { isExclusiveEquipment, isValidCombination, validCombinations } from "./combinations.ts";
import { MUSCLE_IDS } from "./taxonomy.ts";

/** muscleWeights の合計が 1.0 とみなせる許容誤差。 */
export const WEIGHT_SUM_TOLERANCE = 1e-6;

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
    /**
     * free-exercise-db 側の id。上流の更新に追随するために保持する。
     *
     * **配列なのは統合するため。** バーベルベンチとダンベルベンチは
     * 器具軸で 1 レコードに畳まれる（ADR 0002、ADR 0006）。
     * 空配列は上流に存在しない独自種目を意味する。
     */
    sourceIds: z.array(z.string()).refine((ids) => new Set(ids).size === ids.length, {
      message: "sourceIds が重複しています",
    }),

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
  })
  .refine(
    (ex) => ex.equipmentOptions.length === 1 || !ex.equipmentOptions.some(isExclusiveEquipment),
    {
      message: "body_only は他の器具と併記できません（自重種目に器具の付け替えはない）",
      path: ["equipmentOptions"],
    },
  )
  .refine((ex) => validCombinations(ex).length > 0, {
    message: "有効な器具 × 片手/両手の組み合わせが 1 つもありません",
    path: ["lateralityOptions"],
  })
  .refine((ex) => isValidCombination(ex, ex.defaultEquipment, ex.defaultLaterality), {
    message: "既定の器具と既定の片手/両手が有効な組み合わせになっていません",
    path: ["defaultLaterality"],
  });

export type Exercise = z.infer<typeof exerciseSchema>;

export const datasetSchema = z.array(exerciseSchema).superRefine((list, ctx) => {
  const seenIds = new Set<string>();
  // 上流 id は全レコードを通して一意。同じ上流種目が 2 レコードに出るのは統合の取りこぼし。
  const seenSourceIds = new Set<string>();
  for (const [index, ex] of list.entries()) {
    if (seenIds.has(ex.id)) {
      ctx.addIssue({
        code: "custom",
        message: `id が重複しています: ${ex.id}`,
        path: [index, "id"],
      });
    }
    seenIds.add(ex.id);

    for (const sourceId of ex.sourceIds) {
      if (seenSourceIds.has(sourceId)) {
        ctx.addIssue({
          code: "custom",
          message: `上流 id が複数のレコードに現れています: ${sourceId}`,
          path: [index, "sourceIds"],
        });
      }
      seenSourceIds.add(sourceId);
    }
  }
});
