/**
 * 中臀筋と内転筋を、上流が記録していない種目に補う。
 *
 * **これは写像ではなく補完。** 上流の `abductors` は 5 件、`adductors` は 6 件しかないが、
 * 解剖学的には片脚種目やワイドスタンスのスクワットで確実に働く。
 * **上流が記録していないだけ**なので、データセット側で足す（ADR 0005）。
 *
 * §11 でこのデータセット自体を資産と位置づけている以上、
 * 既存データセットが持っていない情報を足すことが価値になる。
 */
import type { MuscleId } from "../../src/taxonomy.ts";

export interface HipStabilizerAddition {
  readonly muscles: readonly MuscleId[];
  readonly rule: string;
}

const GLUTEUS_MEDIUS: MuscleId = "gluteus_medius";
const ADDUCTORS: MuscleId = "adductors";

/**
 * 片脚支持の種目。**骨盤の水平を保つのに中臀筋が働く。**
 *
 * 片脚立ちでは支持脚と反対側の骨盤が落ちようとするので、
 * 支持脚の中臀筋が等尺性に働いてこれを止める（トレンデレンブルグ徴候の逆）。
 */
const SINGLE_LEG =
  /lunge|split squat|step[- ]?up|single[- ]?leg|one[- ]?leg|bulgarian|pistol|curtsy|skater|one legged/i;

/** ワイドスタンス・スモウ。股関節外転位での伸展になる。 */
const WIDE_STANCE = /sumo|wide stance|wide[- ]?grip squat|plie|frog/i;

/** 前額面の動作。外転と内転の両方が主働する。 */
const FRONTAL_PLANE =
  /side lunge|lateral lunge|side step|lateral bound|lateral box|side leg|abduct|adduct|carioca|cossack/i;

/** 下半身の種目かどうか。上半身の種目に股関節の安定筋を足さないためのガード。 */
function isLowerBody(muscles: readonly string[]): boolean {
  return muscles.some((m) =>
    ["quadriceps", "hamstrings", "glutes", "abductors", "adductors", "calves"].includes(m),
  );
}

export interface HipStabilizerInput {
  readonly name: string;
  readonly primaryMuscles: readonly string[];
  readonly secondaryMuscles: readonly string[];
}

/**
 * 種目に補う股関節の安定筋を返す。
 *
 * @returns 補うものがなければ null
 */
export function addHipStabilizers(input: HipStabilizerInput): HipStabilizerAddition | null {
  if (!isLowerBody([...input.primaryMuscles, ...input.secondaryMuscles])) return null;

  if (FRONTAL_PLANE.test(input.name)) {
    return {
      muscles: [GLUTEUS_MEDIUS, ADDUCTORS],
      rule: "中臀筋+内転筋: 前額面の動作（外転と内転の両方が主働）",
    };
  }
  if (WIDE_STANCE.test(input.name)) {
    return {
      muscles: [GLUTEUS_MEDIUS, ADDUCTORS],
      rule: "中臀筋+内転筋: ワイドスタンス（股関節外転位での伸展）",
    };
  }
  if (SINGLE_LEG.test(input.name)) {
    return {
      muscles: [GLUTEUS_MEDIUS],
      rule: "中臀筋: 片脚支持（骨盤の水平を保つ）",
    };
  }
  return null;
}
