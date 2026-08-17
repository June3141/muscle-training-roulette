/**
 * 上流の `abdominals`（一塊）を腹直筋 / 腹斜筋 / 腹横筋に写像する。
 *
 * 対象は延べ 138 件（primary 85 + secondary 53）。
 *
 * 分け方は**体幹に何をさせているか**で決まる。
 *
 * - 屈曲（体を丸める）→ 腹直筋
 * - 回旋・側屈 → 腹斜筋
 * - 姿勢を保つ（動かさない）→ 腹横筋
 *
 * ここで決めるのは分類だけ。比率は M2 の重み生成で決める。
 */
import type { MuscleId } from "../../src/taxonomy.ts";
import { ABDOMINAL_OVERRIDES } from "./abdominal-overrides.ts";

export interface AbdominalMapping {
  readonly muscles: readonly MuscleId[];
  readonly rule: string;
}

export interface AbdominalMappingInput {
  readonly id: string;
  readonly name: string;
  readonly primaryMuscles: readonly string[];
}

const RECTUS: MuscleId = "rectus_abdominis";
const OBLIQUES: MuscleId = "obliques";
const TRANSVERSUS: MuscleId = "transversus_abdominis";

/** 上から順に適用する。回旋を屈曲より先に見る（サイドクランチは腹斜筋）。 */
const RULES: readonly { readonly pattern: RegExp; readonly mapping: AbdominalMapping }[] = [
  {
    pattern:
      /twist|oblique|side bend|russian|wood ?chop|windshield|side crunch|bicycle|side plank|side bridge|windmill|judo flip|heel touch|saxon/i,
    mapping: { muscles: [OBLIQUES], rule: "腹斜筋: 回旋・側屈系" },
  },
  {
    pattern:
      /plank|hollow|dead bug|bird dog|rollout|roller|pallof|vacuum|bracing|isometric|l-sit|flag|lever|planche|ab wheel/i,
    mapping: { muscles: [TRANSVERSUS], rule: "腹横筋: 姿勢保持・アンチ伸展系" },
  },
  {
    pattern:
      /crunch|sit[- ]?up|leg raise|knee raise|hip raise|v-up|jackknife|toe touch|leg pull|cocoon|butt[- ]?up|bottoms up|air bike|scissor/i,
    mapping: { muscles: [RECTUS], rule: "腹直筋: 体幹屈曲系" },
  },
];

/**
 * 腹筋の部位を判定する。
 *
 * 名前で判別できない場合、**補助として入っている `abdominals` は腹横筋**とする。
 * スクワットやデッドリフトの腹筋は体幹を固める働きであって、屈曲でも回旋でもない。
 *
 * @returns 判定できた場合は写像、腹筋が主働筋なのに判別できない場合は null
 */
export function mapAbdominals(input: AbdominalMappingInput): AbdominalMapping | null {
  const override = ABDOMINAL_OVERRIDES[input.id];
  if (override) return { muscles: override.muscles, rule: "手動判定（動作を確認して決定）" };

  for (const { pattern, mapping } of RULES) {
    if (pattern.test(input.name)) return mapping;
  }

  // 腹筋が主働筋なのに名前で判別できないものは、機械的に決めず個別判断に回す
  if (input.primaryMuscles.includes("abdominals")) return null;

  return {
    muscles: [TRANSVERSUS],
    rule: "腹横筋: 他部位の種目における体幹の固定",
  };
}
