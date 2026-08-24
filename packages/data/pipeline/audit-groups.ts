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
  "flyes",
  "lunge",
  "press",
  "pull-up",
  "chin-up",
  "dip",
  "shrug",
  "crunch",
  "calf raise",
] as const;

export interface Group {
  readonly keyword: string;
  readonly byPrimary: Map<string, UpstreamExercise[]>;
}

export function matchesKeyword(name: string, keyword: string): boolean {
  const escaped = keyword.replaceAll("-", "\\-");
  return new RegExp(`\\b${escaped}\\b`, "i").test(name);
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
