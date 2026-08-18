/**
 * データセットを書き出す（`pnpm data:build`）。
 *
 * **出力はコミットする。** 上流の生データと違い、これは成果物そのもの（CLAUDE.md）。
 * 重みを触ると差分が出るのは意図した仕組みで、ゴールデンセットと同じ役割を果たす。
 */
import { writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { datasetSchema } from "../../src/schema.ts";
import { isTargetCategory, loadUpstream } from "../upstream.ts";
import { buildDataset } from "./build.ts";

const OUTPUT = resolve(dirname(fileURLToPath(import.meta.url)), "../../../../data/dataset.json");

const upstream = (await loadUpstream()).filter(isTargetCategory);
const { exercises, dropped } = buildDataset(upstream);

const result = datasetSchema.safeParse(exercises);
if (!result.success) {
  console.error(JSON.stringify(result.error.issues.slice(0, 10), null, 2));
  throw new Error(`データセットがスキーマを通りません: ${result.error.issues.length} 件`);
}

await writeFile(OUTPUT, `${JSON.stringify(exercises, null, 2)}\n`, "utf8");

console.log(`上流 ${upstream.length} 件 -> ${exercises.length} 種目`);
console.log(`${OUTPUT} に書き出した`);
console.log(`\n=== 載せなかった ${dropped.length} 件 ===`);
for (const entry of dropped) console.log(`  ${entry.nameEn}: ${entry.reason}`);
