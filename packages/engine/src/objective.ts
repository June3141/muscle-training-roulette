/**
 * 選択エンジンの目的関数（design.md §5.2、ADR 0008）。
 *
 * §5.2 は 4 項を挙げているが、ここは 3 項で書く。
 * **重複ペナルティを独立項にせず、カバレッジ項の凹関数に吸わせている。**
 * 同一筋に重ねるほど限界利得が落ちるので、減点を別に足すと同じ効果が二重に掛かる。
 *
 * 多様性と複合種目は減点ではなく加点で書く。種目数が固定なら両者は定数差で等価だが、
 * **加点の形でだけ単調劣モジュラ性が保たれる。** 崩すと貪欲法の近似保証の前提が消える。
 */
import type { Exercise, MuscleId } from "@mtr/data";
import { computeCoverage } from "./coverage.ts";

export const OBJECTIVE_WEIGHTS = {
  /** 基準。他の 2 項はこれに対する相対値で決める。 */
  coverage: 1,

  /**
   * 動作パターン 1 種類あたりの加点。
   *
   * **整数の種類数に掛かるので、決定が一度反転するとそれ以上動かない。**
   * 実データの chest_only では 0.05〜0.3 の範囲で出力が変わらない。細かく振る意味がない。
   */
  diversity: 0.15,

  /**
   * compound 1 件あたりの加点。
   *
   * **単関節種目を候補から押し出す向きに働く。** design.md §5.2 が求めているのは
   * 「序盤に compound を配置しやすくする」ことなので、本来は §5.3 の順序付けの仕事。
   * 選択時に効かせるかどうかは #14 で決め直す。
   */
  compound: 0.1,
};

/**
 * カバレッジ項。筋ごとに平方根を噛ませてから足す。
 *
 * 平方根が無いと単なる重み合計になり、**1 部位に全種目が集中しても値が下がらない。**
 * 胸を指定すると 5 種目すべてが大胸筋中下部のフライ系で埋まる。
 *
 * 重みは常に正（スキーマが `gt(0)`）で、毎回合計を取り直すので平方根に負が入らない。
 * 差分更新に変えると加減算の誤差で負へ振れ、`Math.sqrt` が NaN を返す。
 * **NaN との比較は黙って false になり、最適解を取りこぼしても例外が出ない。**
 * その形にするなら 0 で止める必要がある。
 */
export function coverageTerm(set: readonly Exercise[], targets: readonly MuscleId[]): number {
  const coverage = computeCoverage(set);
  return targets.reduce((sum, muscle) => sum + Math.sqrt(coverage[muscle] ?? 0), 0);
}

/** 多様性項。動作パターンの種類数（design.md §5.2）。 */
export function diversityTerm(set: readonly Exercise[]): number {
  return new Set(set.map((exercise) => exercise.movementPattern)).size;
}

/** 複合種目項。`mechanic` が未設定の種目は数えない（上流に欠損がある）。 */
export function compoundTerm(set: readonly Exercise[]): number {
  return set.filter((exercise) => exercise.mechanic === "compound").length;
}

export function objective(set: readonly Exercise[], targets: readonly MuscleId[]): number {
  return (
    OBJECTIVE_WEIGHTS.coverage * coverageTerm(set, targets) +
    OBJECTIVE_WEIGHTS.diversity * diversityTerm(set) +
    OBJECTIVE_WEIGHTS.compound * compoundTerm(set)
  );
}
