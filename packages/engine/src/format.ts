/**
 * 選択結果を人が読む形にする。
 *
 * CLI とゴールデンセットのスナップショットが同じ関数を使う。
 * **スナップショットの差分は人間が改善か劣化かを判断するためのものなので、
 * 判断に要る軸をすべて出す。** 動作パターンと mechanic が無いと
 * 「なぜこの種目が選ばれたか」を読めない。
 */
import { MUSCLES, MUSCLE_IDS, type MuscleId } from "@mtr/data";
import type { SelectionResult } from "./types.ts";

/**
 * カバレッジはタキソノミーの並び順で出す。
 * **`Object.keys` の順に出すと、重みを触っただけで無関係な行が動いて差分が読めなくなる。**
 */
function coverageLines(result: SelectionResult): string[] {
  return MUSCLE_IDS.filter((muscle) => (result.coverage[muscle] ?? 0) > 0).map(
    (muscle) => `  ${MUSCLES[muscle].ja}: ${(result.coverage[muscle] ?? 0).toFixed(2)}`,
  );
}

function jaNamesOf(muscles: readonly MuscleId[]): string {
  return muscles.map((muscle) => MUSCLES[muscle].ja).join("、");
}

export function formatSelection(result: SelectionResult): string {
  const lines = result.exercises.map((selected, index) => {
    const { exercise } = selected;
    const axes = [
      exercise.movementPattern,
      exercise.mechanic ?? "mechanic 不明",
      selected.equipment,
      selected.laterality,
    ];
    return `${index + 1}. ${exercise.nameJa}\n   ${axes.join(" / ")}`;
  });

  return [
    lines.join("\n"),
    "",
    "カバレッジ（種目数換算）",
    ...coverageLines(result),
    "",
    `カバーできない部位: ${result.uncovered.length === 0 ? "なし" : jaNamesOf(result.uncovered)}`,
  ].join("\n");
}
