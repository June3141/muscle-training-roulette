/**
 * free-exercise-db の生データを読む。
 *
 * ここは**上流の形をそのまま表現する層**であり、本プロジェクトのスキーマとは別物。
 * 変換は写像側（M1 の各スクリプト）の責務。
 *
 * 生データは `pnpm data:fetch` で取得する。コミットしない（.gitignore）。
 */
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

/** 上流の 1 レコード。フィールドの欠損は上流の実態に合わせて null 許容にしている。 */
export interface UpstreamExercise {
  readonly id: string;
  readonly name: string;
  readonly force: string | null;
  readonly level: string;
  readonly mechanic: string | null;
  readonly equipment: string | null;
  readonly primaryMuscles: readonly string[];
  readonly secondaryMuscles: readonly string[];
  readonly instructions: readonly string[];
  readonly category: string;
  readonly images: readonly string[];
}

const PIPELINE_DIR = dirname(fileURLToPath(import.meta.url));
const UPSTREAM_PATH = resolve(PIPELINE_DIR, "../../../data/upstream/exercises.json");

export async function loadUpstream(path: string = UPSTREAM_PATH): Promise<UpstreamExercise[]> {
  let raw: string;
  try {
    raw = await readFile(path, "utf8");
  } catch {
    throw new Error(
      `上流データが見つかりません: ${path}\n先に \`pnpm data:fetch\` を実行してください`,
    );
  }

  const parsed: unknown = JSON.parse(raw);
  if (!Array.isArray(parsed) || parsed.length === 0) {
    throw new Error(`上流データが空、または配列ではありません: ${path}`);
  }
  return parsed as UpstreamExercise[];
}

/**
 * 重み付けの対象にするカテゴリ（Issue #3 の結論）。
 *
 * `stretching` と `cardio` は muscleWeights の意味が変わる（負荷配分ではない）ので外す。
 * それ以外は残す。**カテゴリ単位で切ると中身の例外を落とす**ため
 * （docs/data-survey.md の「対象範囲は 736 件」を参照）。
 */
const TARGET_CATEGORIES = new Set([
  "strength",
  "powerlifting",
  "olympic weightlifting",
  "plyometrics",
  "strongman",
]);

export function isTargetCategory(exercise: UpstreamExercise): boolean {
  return TARGET_CATEGORIES.has(exercise.category);
}
