/**
 * 統合結果を人が読む形で出す（`pnpm data:merge`）。
 *
 * 統合は 736 件を 617 件に畳む操作で、**畳み方を間違えても件数だけでは気づけない。**
 * どのベース名が何を吸収したかと、規則で落とした組み合わせを並べて目視できるようにする。
 */
import { validCombinations } from "../../src/combinations.ts";
import { isTargetCategory, loadUpstream } from "../upstream.ts";
import { mergeUpstream, type MergedExercise } from "./merge.ts";

function droppedCombinations(record: MergedExercise): string[] {
  const valid = validCombinations(record);
  const dropped: string[] = [];
  for (const equipment of record.equipmentOptions) {
    for (const laterality of record.lateralityOptions) {
      const kept = valid.some((c) => c.equipment === equipment && c.laterality === laterality);
      if (!kept) dropped.push(`${equipment} x ${laterality}`);
    }
  }
  return dropped;
}

const upstream = (await loadUpstream()).filter(isTargetCategory);
const merged = mergeUpstream(upstream);
const absorbed = merged.filter((record) => record.sourceIds.length > 1);

const baseNameCounts = new Map<string, number>();
for (const record of merged) {
  baseNameCounts.set(record.baseName, (baseNameCounts.get(record.baseName) ?? 0) + 1);
}
const splitBases = [...baseNameCounts.values()].filter((count) => count > 1).length;

console.log(`上流 ${upstream.length} 件 -> ${merged.length} レコード`);
console.log(
  `${absorbed.length} レコードが ${absorbed.reduce((sum, r) => sum + r.sourceIds.length, 0)} 件を吸収`,
);
console.log(`主働筋が違うため畳まなかったベース名: ${splitBases} 件`);

console.log("\n=== 2 件以上を畳んだレコード ===");
for (const record of absorbed.toSorted((a, b) => b.sourceIds.length - a.sourceIds.length)) {
  console.log(`\n[${record.baseName}] ${record.primaryMuscles.join(",")}`);
  console.log(
    `   器具: ${record.equipmentOptions.join(", ")} / 既定 ${record.defaultEquipment}` +
      ` | ${record.lateralityOptions.join(", ")} / 既定 ${record.defaultLaterality}`,
  );
  for (const sourceId of record.sourceIds) console.log(`     - ${sourceId}`);
}

console.log("\n=== 規則で落とした組み合わせ ===");
for (const record of merged) {
  const dropped = droppedCombinations(record);
  if (dropped.length > 0) console.log(`  ${record.nameEn}: ${dropped.join(", ")}`);
}
