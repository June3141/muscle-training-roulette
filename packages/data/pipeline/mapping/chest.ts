/**
 * 上流の `chest`（一塊）を大胸筋 上部（鎖骨部）/ 中下部（胸肋部）に写像する。
 *
 * 対象は延べ 133 件（primary 79 + secondary 54）。
 *
 * ここで決めるのは**どの分類に属するか**だけ。比率は M2 の重み生成で決める。
 */
import type { MuscleId } from "../../src/taxonomy.ts";

export interface ChestMapping {
  readonly muscles: readonly MuscleId[];
  readonly rule: string;
}

export interface ChestMappingInput {
  readonly name: string;
  readonly force: string | null;
  readonly primaryMuscles: readonly string[];
}

const UPPER: MuscleId = "pectoralis_major_clavicular";
const LOWER: MuscleId = "pectoralis_major_sternal";

const IS_PUSH_UP = /push[- ]?up|pushup/i;
const IS_INCLINE = /\binclin/i;
const IS_DECLINE = /\bdeclin/i;

/**
 * **プッシュアップでは incline / decline の意味がベンチプレスと逆になる。**
 *
 * 上流の instructions で確認済み。
 *
 * - `Decline Push-Up`: 「Move your feet up to a box or bench」= 足を高くする
 *   → 上体が前傾し、インクラインプレスと同じ角度になる → **上部**
 * - `Incline Push-Up`: 「Place hands on edge of bench」= 手を高くする
 *   → 上体が後傾し、デクラインプレスと同じ角度になる → **中下部**
 *
 * ベンチプレスは台に対する体の向きで決まるので、そのまま
 * incline → 上部 / decline → 中下部。
 */
function mapByAngle(name: string): ChestMapping {
  if (IS_PUSH_UP.test(name)) {
    if (IS_DECLINE.test(name)) {
      return {
        muscles: [UPPER],
        rule: "上部: デクラインプッシュアップ（足を高くする＝上体が前傾）",
      };
    }
    if (IS_INCLINE.test(name)) {
      return {
        muscles: [LOWER],
        rule: "中下部: インクラインプッシュアップ（手を高くする＝上体が後傾）",
      };
    }
    return { muscles: [LOWER], rule: "中下部: プッシュアップ（水平）" };
  }

  if (IS_INCLINE.test(name)) {
    return { muscles: [UPPER], rule: "上部: インクライン系" };
  }
  if (IS_DECLINE.test(name)) {
    return { muscles: [LOWER], rule: "中下部: デクライン系" };
  }
  return { muscles: [LOWER], rule: "中下部: 水平（既定）" };
}

/**
 * 大胸筋の部位を判定する。
 *
 * **角度がすべて。** 大胸筋は起始が鎖骨部と胸肋部に分かれており、
 * 上腕をどの角度で挙上するかで動員が変わる。器具やグリップでは変わらない。
 */
export function mapChest(input: ChestMappingInput): ChestMapping {
  return mapByAngle(input.name);
}
