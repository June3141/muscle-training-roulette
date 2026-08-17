/**
 * 筋肉タキソノミー（design.md §4.3、確定は ADR 0005）。
 *
 * 既存データセットはどれも粒度が粗い（`delts` / `chest` 等の一塊）。
 * 部位可視化を成立させるには最低限この分割が必要。
 *
 * 「Core」のような部位総称は筋肉名として使わない。
 *
 * §4.3 からの変更点（ADR 0005）:
 * - 菱形筋を僧帽筋中下部に統合（判別材料がなく、分類として情報を持たないため）
 * - 首は対象外。上流に 5 件あるが secondary 参照が 0 で、他のどの種目とも繋がっていない
 */

export const MUSCLES = {
  // 三角筋
  deltoid_anterior: { ja: "三角筋前部", group: "shoulders" },
  deltoid_lateral: { ja: "三角筋中部", group: "shoulders" },
  deltoid_posterior: { ja: "三角筋後部", group: "shoulders" },

  // 大胸筋
  pectoralis_major_clavicular: { ja: "大胸筋上部", group: "chest" },
  pectoralis_major_sternal: { ja: "大胸筋中下部", group: "chest" },

  // 背中
  // 菱形筋は僧帽筋中下部に含める（ADR 0005）。
  // 上流の middle back 関連 73 件のうち肩甲骨内転を主目的と読める種目名は 5 件しかなく、
  // 分けても常に同じ値になって分類として情報を持たないため。
  latissimus_dorsi: { ja: "広背筋", group: "back" },
  trapezius_upper: { ja: "僧帽筋上部", group: "back" },
  trapezius_middle_lower: { ja: "僧帽筋中下部・菱形筋", group: "back" },
  erector_spinae: { ja: "脊柱起立筋", group: "back" },

  // 上腕
  biceps_brachii: { ja: "上腕二頭筋", group: "arms" },
  triceps_brachii: { ja: "上腕三頭筋", group: "arms" },
  brachioradialis: { ja: "腕橈骨筋", group: "arms" },

  // 下半身
  quadriceps: { ja: "大腿四頭筋", group: "legs" },
  hamstrings: { ja: "ハムストリングス", group: "legs" },
  gluteus_maximus: { ja: "大臀筋", group: "legs" },
  gluteus_medius: { ja: "中臀筋", group: "legs" },
  adductors: { ja: "内転筋群", group: "legs" },
  triceps_surae: { ja: "下腿三頭筋", group: "legs" },

  // 体幹
  rectus_abdominis: { ja: "腹直筋", group: "trunk" },
  obliques: { ja: "腹斜筋", group: "trunk" },
  transversus_abdominis: { ja: "腹横筋", group: "trunk" },
} as const satisfies Record<string, { ja: string; group: MuscleGroup }>;

export type MuscleId = keyof typeof MUSCLES;

/** 部位選択 UI のまとまり。筋肉名ではないので muscleWeights のキーには使わない。 */
export const MUSCLE_GROUPS = {
  chest: "胸",
  back: "背中",
  shoulders: "肩",
  arms: "腕",
  legs: "脚",
  trunk: "体幹",
} as const;

export type MuscleGroup = keyof typeof MUSCLE_GROUPS;

export const MUSCLE_IDS = Object.keys(MUSCLES) as readonly MuscleId[];

export function isMuscleId(value: string): value is MuscleId {
  return Object.hasOwn(MUSCLES, value);
}

export function musclesInGroup(group: MuscleGroup): MuscleId[] {
  return MUSCLE_IDS.filter((id) => MUSCLES[id].group === group);
}
