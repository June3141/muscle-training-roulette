/**
 * free-exercise-db の生データを data/upstream/ に取得する。
 *
 * 取得物はコミットしない（.gitignore）。このスクリプトで再現できるため。
 * 上流は Unlicense なので再配布に制約はないが、リポジトリに 1MB の重複を持つ理由がない。
 *
 * 使い方: pnpm data:fetch
 */
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const UPSTREAM_URL =
  "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/dist/exercises.json";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const outputPath = resolve(repoRoot, "data/upstream/exercises.json");

const response = await fetch(UPSTREAM_URL);
if (!response.ok) {
  throw new Error(`上流の取得に失敗しました: ${response.status} ${response.statusText}`);
}

const exercises = await response.json();
if (!Array.isArray(exercises) || exercises.length === 0) {
  throw new Error("上流のレスポンスが空、または配列ではありません");
}

await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(exercises, null, 2)}\n`);

console.log(`${exercises.length} 件を ${outputPath} に保存しました`);
