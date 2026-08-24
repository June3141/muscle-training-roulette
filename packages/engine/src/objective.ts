/**
 * 選択エンジンの目的関数（design.md §5.2、ADR 0008）。
 *
 * §5.2 は 4 項を挙げているが、ここは 2 項で書く。
 *
 * **重複ペナルティを独立項にせず、カバレッジ項の凹関数に吸わせている。**
 * 同一筋に重ねるほど限界利得が落ちるので、減点を別に足すと同じ効果が二重に掛かる。
 *
 * **複合種目優先は目的関数に持たない。** §5.2 の文言は「序盤に配置しやすくする」で、
 * これは §5.3 の順序付けが担う（ADR 0009）。選択時に効かせると単関節種目が候補から
 * 押し出され、胸を指定してもフライが選ばれなくなる。
 *
 * 多様性は減点ではなく加点で書く。種目数が固定なら両者は定数差で等価だが、
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
   *
   * 0.15 は「全種目が同じ動作パターンになる結果が出ない」最小値として決めた。
   * これを下回ると、目的関数の値はほとんど動かないまま出力だけが同じ動作へ倒れる。
   * カバレッジ項は 2.2% 落ちるが、これは同点集合の中での移動でしかない（ADR 0008）。
   */
  diversity: 0.15,
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

/**
 * 多様性項が加点を払わない動作パターン（ADR 0011）。
 *
 * **`MOVEMENT_PATTERNS` に置いたのは `other` に落ちるレコードを減らすためで、
 * 刺激の種類として置いたものではない。** 数えると多様性項が必ずそこへ手を伸ばす。
 * 件数は `docs/data-survey.md` の分布表を見る（ここに書くとドリフトする）。
 */
const UNCOUNTED_PATTERNS: ReadonlySet<Exercise["movementPattern"]> = new Set(["throw", "jump"]);

/**
 * 多様性項が数える種目（ADR 0011）。
 *
 * **候補からは外さない。** カバレッジで勝つなら選ばれる。
 * 内転筋のようにプライオメトリクスが主力の部位では出力が変わらない。
 *
 * カテゴリ一律では切らない。`olympic_weightlifting` と `strongman` には
 * 一般的な筋力種目が混ざっている（docs/data-survey.md）。
 * 逆にカテゴリだけでも足りない。`throw` と `jump` の 4 件は上流が `strength` としている。
 */
function countsForDiversity(exercise: Exercise): boolean {
  return exercise.category !== "plyometrics" && !UNCOUNTED_PATTERNS.has(exercise.movementPattern);
}

/** 多様性項。動作パターンの種類数（design.md §5.2）。 */
export function diversityTerm(set: readonly Exercise[]): number {
  return new Set(set.filter(countsForDiversity).map((exercise) => exercise.movementPattern)).size;
}

export function objective(set: readonly Exercise[], targets: readonly MuscleId[]): number {
  return (
    OBJECTIVE_WEIGHTS.coverage * coverageTerm(set, targets) +
    OBJECTIVE_WEIGHTS.diversity * diversityTerm(set)
  );
}
