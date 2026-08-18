/**
 * 器具軸と片手/両手軸の有効な組み合わせ（design.md §2 Q2）。
 *
 * この 2 つは独立軸として分離したが（§4.2、ADR 0002）、**直積がすべて有効ではない。**
 * バーベルベンチプレスに「片手」は存在しない。UI が直積をそのまま出すと、
 * 実在しない組み合わせを提案してしまう。
 *
 * ここで持つのは**器具の物理的な制約だけ**で、種目ごとの例外は持たない。
 * 例外表を持ち始めると 800 件分の判断が必要になり、軸に分けた意味がなくなる。
 */
import type { Equipment, Laterality, MovementPattern } from "./axes.ts";
import { LATERALITY } from "./axes.ts";

/**
 * 1 本の剛体を両手で保持する器具。
 *
 * 左右を独立に動かせないので、**上半身では片手を選べない。**
 * マシンを含めないのは、左右のアームが独立したイソラテラル機が一般的なため。
 * ケーブルも 2 基のプーリーがあり片手・両手のどちらも成立する。
 */
const SINGLE_BAR: ReadonlySet<Equipment> = new Set<Equipment>(["barbell", "ez_curl_bar", "smith"]);

/**
 * 下半身の動作パターン。
 *
 * ここでの「片手/両手」は実際には**片脚/両脚**を指す。
 * バーを背中に担いだまま片脚で立てるので、`SINGLE_BAR` の制約を受けない。
 * 上流の One Leg Barbell Squat / Smith Single-Leg Split Squat がこの形。
 */
const LOWER_BODY: ReadonlySet<MovementPattern> = new Set<MovementPattern>([
  "squat",
  "hinge",
  "lunge",
  "leg_isolation",
  "calf_raise",
]);

/** 他の器具と併記できない器具。自重種目に「バーベル版」はない。 */
export function isExclusiveEquipment(equipment: Equipment): boolean {
  return equipment === "body_only";
}

/** 判定に必要な最小の入力。`Exercise` をそのまま渡せる。 */
export interface AxisInput {
  readonly movementPattern: MovementPattern;
  readonly equipmentOptions: readonly Equipment[];
  readonly lateralityOptions: readonly Laterality[];
}

export interface Combination {
  readonly equipment: Equipment;
  readonly laterality: Laterality;
}

/**
 * その種目でこの組み合わせが成立するか。
 *
 * **既知の反例**: 上流の Smith Machine One-Arm Upright Row は上半身のスミス片手種目で、
 * ここでは無効と判定される。ガイドレールがバーを支えるので実際には可能だが、
 * これを許すとスミスの片手ベンチプレスまで有効になる。
 * 1 件を落とす代わりに、明らかに存在しない組み合わせを出さない側を採る。
 */
export function isValidCombination(
  input: AxisInput,
  equipment: Equipment,
  laterality: Laterality,
): boolean {
  if (!input.equipmentOptions.includes(equipment)) return false;
  if (!input.lateralityOptions.includes(laterality)) return false;
  if (laterality === "bilateral") return true;
  if (LOWER_BODY.has(input.movementPattern)) return true;
  return !SINGLE_BAR.has(equipment);
}

/** 有効な組み合わせだけを列挙する。UI が提示できる選択肢そのもの。 */
export function validCombinations(input: AxisInput): Combination[] {
  const result: Combination[] = [];
  for (const equipment of input.equipmentOptions) {
    for (const laterality of LATERALITY) {
      if (isValidCombination(input, equipment, laterality)) result.push({ equipment, laterality });
    }
  }
  return result;
}
