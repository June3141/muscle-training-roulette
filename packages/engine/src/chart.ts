/**
 * カバレッジのバーチャート（design.md §2、§3）。
 *
 * **可視化は Q1 の主計測器。** 「重み付けデータは特に効く部位を表現できるか」は
 * 数字の羅列では判断できない。だから判断に要る情報を落とさないことを最優先にする。
 *
 * - 指定したのにカバレッジ 0 の部位も行を残す。消すと要求が満たされたように見える
 * - 指定していないのに乗った部位も出す。波及が見えないと違和感を言語化できない
 * - 行はタキソノミー順で固定する。値の降順にすると重みを 1 件触るだけで行が動く
 *
 * 依存も外部参照も持たない SVG 文字列を返す。画像素材を使わない方針（§8）に加えて、
 * **CLI からファイルに落としてそのまま開ける**必要があるため。
 *
 * 人体図の塗り分けは M6（[ADR 0003](../../../docs/adr/0003-muscle-taxonomy-vs-svg-granularity.md)）。
 */
import { MUSCLES, MUSCLE_IDS, type MuscleId } from "@mtr/data";
import type { Coverage } from "./types.ts";

const LAYOUT = {
  padding: 14,
  rowHeight: 22,
  barHeight: 14,
  labelWidth: 150,
  barWidth: 260,
  valueWidth: 48,
  headerHeight: 26,
} as const;

/** 指定した部位とそれ以外を色で分ける。淡い方が「頼んでいないのに乗った分」。 */
const COLORS = {
  background: "#ffffff",
  track: "#e5e7eb",
  target: "#2563eb",
  incidental: "#93c5fd",
  label: "#111827",
  value: "#4b5563",
} as const;

const WIDTH = LAYOUT.padding * 2 + LAYOUT.labelWidth + LAYOUT.barWidth + LAYOUT.valueWidth;

/** SVG に埋める文字列を無害化する。部位名は固定値だが、値の書式が壊れても XML は壊さない。 */
function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

/** 末尾の 0 を落とす。幅が `0` のときに `0.000` と書かれると差分が読みにくい。 */
function trim(value: number): string {
  return String(Number(value.toFixed(3)));
}

/**
 * 描く行を決める。
 *
 * 「カバレッジがある」か「指定された」かのどちらかを満たすものを、タキソノミー順に並べる。
 */
function rowsOf(
  coverage: Coverage,
  targets: readonly MuscleId[],
): readonly { readonly muscle: MuscleId; readonly value: number; readonly target: boolean }[] {
  const requested = new Set(targets);
  return MUSCLE_IDS.filter((muscle) => (coverage[muscle] ?? 0) > 0 || requested.has(muscle)).map(
    (muscle) => ({
      muscle,
      value: coverage[muscle] ?? 0,
      target: requested.has(muscle),
    }),
  );
}

function rowSvg(
  row: { readonly muscle: MuscleId; readonly value: number; readonly target: boolean },
  index: number,
  max: number,
): string {
  const top = LAYOUT.padding + LAYOUT.headerHeight + index * LAYOUT.rowHeight;
  const barX = LAYOUT.padding + LAYOUT.labelWidth;
  const barY = top + (LAYOUT.rowHeight - LAYOUT.barHeight) / 2;
  const width = max === 0 ? 0 : (row.value / max) * LAYOUT.barWidth;
  const baseline = top + LAYOUT.rowHeight / 2 + 4;

  return [
    `<text x="${LAYOUT.padding + LAYOUT.labelWidth - 8}" y="${baseline}" text-anchor="end" font-size="12" fill="${COLORS.label}">${escapeXml(MUSCLES[row.muscle].ja)}</text>`,
    `<rect x="${barX}" y="${barY}" width="${LAYOUT.barWidth}" height="${LAYOUT.barHeight}" rx="2" fill="${COLORS.track}"/>`,
    `<rect data-muscle="${row.muscle}" data-target="${row.target}" data-bar-width="${trim(width)}" x="${barX}" y="${barY}" width="${trim(width)}" height="${LAYOUT.barHeight}" rx="2" fill="${row.target ? COLORS.target : COLORS.incidental}"/>`,
    `<text x="${barX + LAYOUT.barWidth + 8}" y="${baseline}" font-size="12" fill="${COLORS.value}">${escapeXml(row.value.toFixed(2))}</text>`,
  ].join("\n  ");
}

export function renderCoverageChart(coverage: Coverage, targets: readonly MuscleId[]): string {
  const rows = rowsOf(coverage, targets);
  const max = Math.max(0, ...rows.map((row) => row.value));
  const height = LAYOUT.padding * 2 + LAYOUT.headerHeight + rows.length * LAYOUT.rowHeight;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${WIDTH} ${height}" width="${WIDTH}" height="${height}" font-family="sans-serif" role="img" aria-label="部位カバレッジ">
  <rect width="${WIDTH}" height="${height}" fill="${COLORS.background}"/>
  <text x="${LAYOUT.padding}" y="${LAYOUT.padding + 14}" font-size="13" fill="${COLORS.label}">部位カバレッジ（種目数換算）</text>
  ${rows.map((row, index) => rowSvg(row, index, max)).join("\n  ")}
</svg>
`;
}
