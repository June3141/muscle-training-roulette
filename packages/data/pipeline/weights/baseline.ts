/**
 * 決定論ベースライン（design.md §4.4 の手順 1）。
 *
 * **品質は問わない。全件に値が入っていることが目的。**
 * ここで作るのはレビューの出発点で、比率の作り分けは手順 3〜4（レビュー）でやる。
 *
 * 重み付けには主観が入るため、収束ではなく「明らかな誤りの除去」を目的に据える
 * （CLAUDE.md）。ベースラインが守るのは 2 つだけ。
 *
 * - 主働筋が補助筋より重い
 * - 合計が 1.0
 *
 * EMG（%MVIC）は使わない。筋間で比較できず、合計が 1 にならないため
 * 配分量に変換できない（§4.4）。
 */
import type { MuscleId } from "../../src/taxonomy.ts";

export type Mechanic = "compound" | "isolation";

/**
 * 主働筋の合計が占める割合。
 *
 * §4.4 は単関節で 0.75〜0.85、多関節の補助筋を 0.10〜0.20 帯としている。
 * 単関節は帯の中央を採った。**多関節は帯どおりにできない。**
 * 補助筋が 10 個ある種目が上流に 4 件あり、1 個 0.15 なら合計 1.5 を超える。
 * 群ごとの取り分を決めて中で等分する方式にした（実測の分布は docs/data-survey.md）。
 */
const PRIMARY_SHARE: Readonly<Record<Mechanic, number>> = {
  isolation: 0.8,
  compound: 0.65,
};

/** 小数第 4 位まで持つ。人力レビュー（M5）で読める桁数にする。 */
const PRECISION = 10_000;

export interface MuscleCounts {
  readonly primary: number;
  readonly secondary: number;
}

/**
 * `mechanic` を補完する。
 *
 * 上流に欠損があり（対象 736 件のうち 7 件）、そのままでは分岐に落ちない。
 * 主働筋 1 つ・補助筋 1 つ以下なら単関節、それ以外は多関節とみなす（§4.4）。
 */
export function resolveMechanic(mechanic: string | null, counts: MuscleCounts): Mechanic {
  if (mechanic === "isolation" || mechanic === "compound") return mechanic;
  return counts.primary === 1 && counts.secondary <= 1 ? "isolation" : "compound";
}

export interface BaselineInput {
  readonly mechanic: string | null;
  readonly primary: readonly MuscleId[];
  readonly secondary: readonly MuscleId[];
}

export type MuscleWeights = Partial<Record<MuscleId, number>>;

function round(value: number): number {
  return Math.round(value * PRECISION) / PRECISION;
}

/**
 * 丸めた結果の端数を主働筋の先頭に寄せる。
 *
 * 等分してから丸めると合計が 1.0 からずれる。スキーマの許容誤差は 1e-6 で、
 * 小数第 4 位の丸めはそれを軽く超える。
 */
function absorbResidual(weights: MuscleWeights, anchor: MuscleId): MuscleWeights {
  const sum = Object.values(weights).reduce<number>((total, value) => total + (value ?? 0), 0);
  return { ...weights, [anchor]: round((weights[anchor] ?? 0) + (1 - sum)) };
}

/**
 * 主働筋と補助筋から重みを作る。
 *
 * @returns 主働筋が無ければ null。写せない種目はデータセットに載せられない
 *   （ローテーターカフ・首・ターキッシュゲットアップの 12 件。`expand.ts` を参照）
 */
export function baselineWeights(input: BaselineInput): MuscleWeights | null {
  const anchor = input.primary[0];
  if (anchor === undefined) return null;

  const mechanic = resolveMechanic(input.mechanic, {
    primary: input.primary.length,
    secondary: input.secondary.length,
  });
  const primaryShare = input.secondary.length === 0 ? 1 : PRIMARY_SHARE[mechanic];

  const weights: MuscleWeights = {};
  for (const muscle of input.primary) weights[muscle] = round(primaryShare / input.primary.length);
  for (const muscle of input.secondary) {
    weights[muscle] = round((1 - primaryShare) / input.secondary.length);
  }
  return absorbResidual(weights, anchor);
}
