/**
 * 上流の primaryMuscles の不整合を洗い出す（Issue「上流の primaryMuscles を監査してから M2 に渡す」）。
 *
 * §4.4 の決定論ベースラインは primary/secondary から按分するので、
 * 上流の primaryMuscles が誤っているとベースライン全体が狂う。
 *
 * 使い方: pnpm data:audit
 *
 * 出力は「同じ動作なのに primaryMuscles が割れているグループ」。
 * 割れていること自体は異常ではない（リストカールとレッグカールは正当に別）。
 * **人間が「正当な差異 / 本当の不整合」を判定し、後者だけを overrides に書く。**
 */
import { PRIMARY_MUSCLE_OVERRIDES } from "./overrides/primary-muscles.ts";
import { type UpstreamExercise, isTargetCategory, loadUpstream } from "./upstream.ts";

/**
 * 動作パターンのキーワード。単語境界でマッチさせる。
 *
 * 境界を見ないと `Nar(row) Stance Leg Press` が「row」に引っかかる。
 */
const MOVEMENT_KEYWORDS = [
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

interface Group {
  readonly keyword: string;
  readonly byPrimary: Map<string, UpstreamExercise[]>;
}

function matchesKeyword(name: string, keyword: string): boolean {
  const escaped = keyword.replaceAll("-", "\\-");
  return new RegExp(`\\b${escaped}\\b`, "i").test(name);
}

function groupByKeyword(exercises: readonly UpstreamExercise[]): Group[] {
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

function reportGroup(group: Group): void {
  const total = [...group.byPrimary.values()].reduce((n, v) => n + v.length, 0);
  console.log(`\n[${group.keyword}] ${total} 件 → primary が ${group.byPrimary.size} 種類`);

  const sorted = [...group.byPrimary.entries()].toSorted((a, b) => b[1].length - a[1].length);
  for (const [primary, list] of sorted) {
    const overridden = list.filter((ex) => ex.id in PRIMARY_MUSCLE_OVERRIDES).length;
    const mark = overridden > 0 ? ` (${overridden} 件は override 済み)` : "";
    console.log(`   ${primary.padEnd(24)} ${String(list.length).padStart(3)} 件${mark}`);
    for (const ex of list.slice(0, 4)) {
      console.log(`       ${ex.id in PRIMARY_MUSCLE_OVERRIDES ? "*" : " "} ${ex.name}`);
    }
    if (list.length > 4) console.log(`         … 他 ${list.length - 4} 件`);
  }
}

const all = await loadUpstream();
const target = all.filter(isTargetCategory);
const groups = groupByKeyword(target).filter((g) => g.byPrimary.size > 1);

console.log(`対象 ${target.length} 件（全 ${all.length} 件中）`);
console.log(`動作グループ ${groups.length} 件で primaryMuscles が割れている`);
console.log("\n* が付いているものは overrides/primary-muscles.ts で修正済み");

for (const group of groups) reportGroup(group);

console.log(`\n現在の override 件数: ${Object.keys(PRIMARY_MUSCLE_OVERRIDES).length}`);
