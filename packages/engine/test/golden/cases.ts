/**
 * ゴールデンセット（design.md §7）。
 *
 * 重みを触るたびに、既存の妥当な出力が壊れていないかを検出する。
 * **これがないと 800 件の調整は破綻する。**
 *
 * 完全一致は求めない。`mustContain` は機械的に検査できる最低条件で、
 * これを満たしていても出力が妥当とは限らない。妥当性は人間が judge し、
 * その結果をスナップショットとして保存して差分だけ確認する。
 */
import { MUSCLE_IDS, type Equipment, type MovementPattern, type MuscleId } from "@mtr/data";

export interface GoldenCase {
  /** スナップショットのキーになるので、変えるとスナップショットが作り直しになる。 */
  readonly id: string;
  readonly label: string;
  readonly targets: readonly MuscleId[];
  readonly count: number;
  readonly allowedEquipment?: readonly Equipment[];
  /**
   * 出力に最低 1 つ含まれていてほしい動作パターンの組。
   * 各要素は OR（どれか 1 つ以上が含まれればよい）、配列全体は AND。
   */
  readonly mustContain: readonly (readonly MovementPattern[])[];
  /**
   * カバーされないことが分かっている部位。
   * 空くこと自体は異常ではないが、黙って空くのは異常。
   */
  readonly knownUncovered?: readonly MuscleId[];
  readonly note?: string;
}

export const GOLDEN_CASES: readonly GoldenCase[] = [
  {
    id: "ppl_push",
    label: "PPL Push — 胸・三角前部・三頭 / 6種目",
    targets: [
      "pectoralis_major_sternal",
      "pectoralis_major_clavicular",
      "deltoid_anterior",
      "triceps_brachii",
    ],
    count: 6,
    mustContain: [["horizontal_press"], ["incline_press"], ["vertical_press"], ["elbow_extension"]],
  },
  {
    id: "ppl_pull",
    label: "PPL Pull — 広背・僧帽・二頭 / 6種目",
    targets: [
      "latissimus_dorsi",
      "trapezius_upper",
      // 菱形筋はこの分類に含まれる（ADR 0005）
      "trapezius_middle_lower",
      "biceps_brachii",
    ],
    count: 6,
    mustContain: [["vertical_pull"], ["horizontal_pull"], ["elbow_flexion"]],
  },
  {
    id: "lower_body",
    label: "下半身 — 四頭・ハム・臀 / 5種目",
    targets: ["quadriceps", "hamstrings", "gluteus_maximus", "gluteus_medius"],
    count: 5,
    mustContain: [["squat"], ["hinge"], ["leg_isolation", "calf_raise"]],
    note: "臀筋の候補は上流に 11 件しかない（docs/data-survey.md）。中臀筋は他種目の secondary から拾う必要がある。",
  },
  {
    id: "chest_only",
    label: "胸のみ — 胸 / 5種目",
    targets: ["pectoralis_major_sternal", "pectoralis_major_clavicular"],
    count: 5,
    mustContain: [["horizontal_press", "incline_press"], ["horizontal_adduction"]],
    note: "プレス系とフライ系が両方含まれること。全部プレスになるなら多様性項が効いていない。",
  },
  {
    id: "bodyweight_full",
    label: "自重のみ — 全身 / 6種目",
    targets: MUSCLE_IDS,
    count: 6,
    allowedEquipment: ["body_only"],
    mustContain: [],
    knownUncovered: ["biceps_brachii"],
    note: "primary が二頭の自重種目は上流に 0 件（docs/data-survey.md）。枯渇せず生成できること、かつ二頭が空くことを明示できることの両方を確認する。",
  },
];
