/**
 * リポジトリにコミットされているデータセットを読む。
 *
 * **Node 専用なので index.ts からは公開しない。** `@mtr/data` の公開面に混ぜると
 * apps/web のバンドルに `node:fs` が混入する。ブラウザ側は M6 でビルド時に取り込む。
 */
import { readFileSync } from "node:fs";
import { datasetSchema, type Exercise } from "@mtr/data";

const DATASET_PATH = new URL("../../../data/dataset.json", import.meta.url);

/**
 * 読み込みのたびにスキーマ検証する。
 *
 * 検証済みのはずでも、**生成し直した JSON が壊れていた場合に
 * 「型は合っているが中身が違う」まま選択エンジンへ流れる**のを防ぐ。
 */
export function loadDataset(): readonly Exercise[] {
  return datasetSchema.parse(JSON.parse(readFileSync(DATASET_PATH, "utf8")));
}
