/**
 * 上流の `forearms`（一塊）を腕橈骨筋 / 前腕屈筋群に写像する。
 *
 * 対象は延べ 115 件。**内訳を見ると腕橈骨筋だけでは足りない。**
 *
 * | 内訳 | 件数 | 写像先 |
 * |---|---|---|
 * | 握力補助（デッドリフト・ロウ・懸垂の secondary） | 76 | **前腕屈筋群** |
 * | 手関節屈伸（リストカール、プレートピンチ） | 21 | **前腕屈筋群** |
 * | 肘屈曲（ハンマーカール、リバースカール） | 18 | 腕橈骨筋 |
 *
 * §4.3 は前腕を腕橈骨筋しか持たないが、腕橈骨筋は**肘屈曲筋**なので、
 * デッドリフトやプルアップで「握力が先に限界になる」ことを表現できない。
 * そのため前腕屈筋群を分類に足した（ADR 0005）。
 */
import type { MuscleId } from "../../src/taxonomy.ts";

export interface ForearmMapping {
  readonly muscles: readonly MuscleId[];
  readonly rule: string;
}

export interface ForearmMappingInput {
  readonly name: string;
  readonly primaryMuscles: readonly string[];
}

const BRACHIORADIALIS: MuscleId = "brachioradialis";
const WRIST_FLEXORS: MuscleId = "wrist_flexors";

/** 手関節の屈伸・保持が主目的の種目。 */
const IS_WRIST = /wrist|finger|\bpinch\b|farmer|\bgripper?\b|forearm roller|roller/i;

/**
 * 肘屈曲で腕橈骨筋が主働する種目。
 *
 * ハンマーカールとリバースカールは前腕回内位で肘を曲げるため腕橈骨筋が優位になる。
 * 通常のカール（回外位）は上腕二頭筋が主で、前腕は補助にとどまる。
 */
const IS_ELBOW_FLEXION = /hammer|reverse.*curl|zottman|preacher|\bcurl\b/i;

/**
 * 前腕の部位を判定する。
 *
 * **握力として関与する場合は前腕屈筋群**。これが 76 件と最多で、
 * デッドリフト・ロウ・懸垂の `forearms` はすべてここに入る。
 */
export function mapForearms(input: ForearmMappingInput): ForearmMapping {
  if (IS_WRIST.test(input.name)) {
    return { muscles: [WRIST_FLEXORS], rule: "前腕屈筋群: 手関節の屈伸・保持" };
  }

  // 前腕が主働筋でカール系なら腕橈骨筋（肘屈曲）
  if (IS_ELBOW_FLEXION.test(input.name)) {
    return { muscles: [BRACHIORADIALIS], rule: "腕橈骨筋: 肘屈曲" };
  }

  // 残りは握力としての関与。デッドリフト、ロウ、懸垂など。
  return { muscles: [WRIST_FLEXORS], rule: "前腕屈筋群: 握力としての関与" };
}
