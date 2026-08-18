/**
 * 筋肉タキソノミーと人体図の領域の対応（ADR 0003、design.md §8.2）。
 *
 * 可視化は Q1 の主計測器（§2）なので、**図の分解能がデータより粗いと検証力が落ちる。**
 * ここで持つのはどの分類がどの領域に出るかの表だけで、SVG そのものは M6 で作る。
 *
 * `source` は流用元（`HichamELBSI/react-native-body-highlighter` 系、MIT）のパス名。
 * ライブラリには依存せず、パスだけ抽出して自前アセットにする（§8）。
 */
import type { MuscleId } from "./taxonomy.ts";
import { MUSCLE_IDS } from "./taxonomy.ts";

export interface BodyRegion {
  readonly ja: string;
  /** 流用元の SVG のパス名。 */
  readonly source: string;
  /** 流用元の 1 パスを自前で分割して作る領域（ADR 0003 の案 A）。 */
  readonly split?: true;
}

/**
 * 人体図の領域。
 *
 * **三角筋だけ流用元より細かい。** 流用元は `front-deltoids` を 1 パスで持つが、
 * 前部と中部を分けないとサイドレイズとショルダープレスが同じ場所を光らせる。
 * 上流 317 件を前部/中部/後部に振り分けたデータがあるのに、図で潰すのは計測器の劣化になる。
 */
export const BODY_REGIONS = {
  chest: { ja: "胸", source: "chest" },
  shoulder_front: { ja: "肩（前）", source: "front-deltoids", split: true },
  shoulder_lateral: { ja: "肩（中）", source: "front-deltoids", split: true },
  shoulder_back: { ja: "肩（後）", source: "back-deltoids" },
  trapezius: { ja: "僧帽筋", source: "trapezius" },
  upper_back: { ja: "背中（上）", source: "upper-back" },
  lower_back: { ja: "腰", source: "lower-back" },
  biceps: { ja: "上腕（前）", source: "biceps" },
  triceps: { ja: "上腕（後）", source: "triceps" },
  forearm: { ja: "前腕", source: "forearm" },
  abs: { ja: "腹直筋", source: "abs" },
  obliques: { ja: "腹斜筋", source: "obliques" },
  quadriceps: { ja: "大腿前面", source: "quadriceps" },
  hamstrings: { ja: "大腿後面", source: "hamstring" },
  glutes: { ja: "臀部", source: "gluteal" },
  /** 流用元は `abductors` という名前だが、座標は内転筋（大腿内側）の位置にある。 */
  adductors: { ja: "内転筋", source: "abductors" },
  calves: { ja: "ふくらはぎ", source: "calves" },
} as const satisfies Record<string, BodyRegion>;

export type BodyRegionId = keyof typeof BODY_REGIONS;

export const BODY_REGION_IDS = Object.keys(BODY_REGIONS) as readonly BodyRegionId[];

/**
 * 分類 → 領域。`null` は人体図に出せないもの。
 *
 * 4 領域で衝突している（複数の分類が同じ領域に乗る）。
 * 表示時は合算する（ADR 0003 の案 C）。区別はバーチャートで読む。
 */
const MUSCLE_REGION: Readonly<Record<MuscleId, BodyRegionId | null>> = {
  deltoid_anterior: "shoulder_front",
  deltoid_lateral: "shoulder_lateral",
  deltoid_posterior: "shoulder_back",

  // 衝突: 上部と中下部が同じパス
  pectoralis_major_clavicular: "chest",
  pectoralis_major_sternal: "chest",

  // 衝突: 流用元の upper-back は広背筋と僧帽筋中下部をまとめて持つ
  latissimus_dorsi: "upper_back",
  trapezius_middle_lower: "upper_back",
  trapezius_upper: "trapezius",
  erector_spinae: "lower_back",

  biceps_brachii: "biceps",
  triceps_brachii: "triceps",
  // 衝突: 腕橈骨筋と前腕屈筋群は体表では分けられない
  brachioradialis: "forearm",
  wrist_flexors: "forearm",

  quadriceps: "quadriceps",
  hamstrings: "hamstrings",
  // 衝突: 中臀筋は大臀筋の深部・上外側にあり、流用元は 1 パス
  gluteus_maximus: "glutes",
  gluteus_medius: "glutes",
  adductors: "adductors",
  triceps_surae: "calves",

  rectus_abdominis: "abs",
  obliques: "obliques",
  transversus_abdominis: null,
};

/**
 * 人体図に出せない分類と、その理由。
 *
 * **黙って消えるのを防ぐためのもの。** 領域も理由も無い分類があればテストが落ちる。
 */
export const UNDISPLAYABLE_MUSCLES: Partial<Record<MuscleId, string>> = {
  transversus_abdominis:
    "深層筋。体表に出ないので図に領域が存在しない。腹直筋に含めると嘘になるため、バーチャートだけで扱う",
};

/** 流用元のパスを自前で分割して作る領域か（ADR 0003 の案 A）。 */
export function needsSplit(region: BodyRegionId): boolean {
  return "split" in BODY_REGIONS[region];
}

export function regionOf(muscle: MuscleId): BodyRegionId | null {
  return MUSCLE_REGION[muscle];
}

export function musclesInRegion(region: BodyRegionId): MuscleId[] {
  return MUSCLE_IDS.filter((id) => MUSCLE_REGION[id] === region);
}
