/**
 * 選択結果を人が読む形にする。
 *
 * CLI とゴールデンセットのスナップショットが同じ関数を使う。
 * **スナップショットの差分は人間が改善か劣化かを判断するためのものなので、
 * 判断に要る軸をすべて出す。** 動作パターンと mechanic が無いと
 * 「なぜこの種目が選ばれたか」を読めない。
 */
import { MUSCLES, MUSCLE_IDS, type MuscleId } from "@mtr/data";
import type { Coverage, SelectionResult } from "./types.ts";

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

/** 表示できる最小の差。これを下回る変化は数値ではなく「未満」で書く。 */
const DIFF_RESOLUTION = 0.01;

/**
 * カバレッジの差分（design.md §6 の [5]）。
 *
 * 「フライ → ディップスに変更 / 上腕三頭筋 +0.18、大胸筋上部 −0.05」を出すための整形。
 *
 * **変化がなかったときに黙って何も出さない形にしない。** 差分が無いのか壊れたのかを
 * 読み手が区別できなくなる。器具を切り替えてもカバレッジは動かないので（ADR 0002）、
 * この区別は実際に必要になる。
 */
export function formatCoverageDiff(diff: Coverage): string {
  const lines = MUSCLE_IDS.filter((muscle) => (diff[muscle] ?? 0) !== 0).map((muscle) => {
    const delta = diff[muscle] ?? 0;
    // 負号は U+2212。ASCII のハイフンだと箇条書きの記号と紛れる。
    const sign = delta > 0 ? "+" : "−";
    const size = Math.abs(delta);
    // **`+0.00` と書くと「変化なし」と区別がつかない。** 重みには 4 桁の値があるので、
    // 差が表示桁より小さくなる組は実在する。
    const amount =
      size < DIFF_RESOLUTION / 2 ? `${DIFF_RESOLUTION.toFixed(2)} 未満` : size.toFixed(2);
    return `  ${MUSCLES[muscle].ja} ${sign}${amount}`;
  });
  return lines.length === 0 ? "  変化なし" : lines.join("\n");
}
