/**
 * 種目名を動作キーワードでグループ化する（`audit-primary.ts` の純粋部分）。
 *
 * **スクリプト本体から切り出してあるのはテストするため。**
 * `audit-primary.ts` は先頭で上流を読んで標準出力に書くので、import すると監査が走ってしまう。
 */
import type { UpstreamExercise } from "./upstream.ts";

/**
 * 動作パターンのキーワード。単語境界でマッチさせる。
 *
 * 境界を見ないと `Nar(row) Stance Leg Press` が「row」に引っかかる。
 * 複数形は `matchesKeyword` が吸収するので、ここには単数だけを置く。
 */
export const MOVEMENT_KEYWORDS = [
  "deadlift",
  "squat",
  "bench press",
  "shoulder press",
  "overhead press",
  "pulldown",
  "row",
  "curl",
  "extension",
  "raise",
  "fly",
  "lunge",
  "press",
  "pull-up",
  "chin-up",
  "dip",
  "shrug",
  "crunch",
  "calf raise",
  "sprint",
] as const;

export interface Group {
  readonly keyword: string;
  readonly byPrimary: Map<string, UpstreamExercise[]>;
}

/**
 * 末尾の `e` / `s` / `es` を許す。
 *
 * **許さないと綴りの揺れた種目名がグループから漏れ、割れとして見えなくなる。**
 * 漏れたレコードは監査に出ないので、上書きの判断材料そのものが欠ける。
 * `e` 単独は `fly` と `flye` のような綴り揺れのため。
 *
 * 単語境界は残す（`Narrow Stance` の `row` を拾わないため）。
 * ここより緩めるとハイフンと空白の揺れ（`Pullups` / `Pull Ups`）や
 * 複合語（`Hyperextension`）まで欲しくなるが、境界を外すと誤検出が増える。
 */
export function matchesKeyword(name: string, keyword: string): boolean {
  const escaped = keyword.replaceAll("-", "\\-");
  return new RegExp(`\\b${escaped}(e|s|es)?\\b`, "i").test(name);
}

export function groupByKeyword(exercises: readonly UpstreamExercise[]): Group[] {
  const groups: Group[] = [];
  for (const keyword of MOVEMENT_KEYWORDS) {
    const hits = exercises.filter((ex) => matchesKeyword(ex.name, keyword));
    if (hits.length < 2) continue;

    const byPrimary = new Map<string, UpstreamExercise[]>();
    for (const ex of hits) {
      const key = ex.primaryMuscles.toSorted().join(",");
      const bucket = byPrimary.get(key);
      if (bucket) bucket.push(ex);
      else byPrimary.set(key, [ex]);
    }
    groups.push({ keyword, byPrimary });
  }
  return groups;
}
