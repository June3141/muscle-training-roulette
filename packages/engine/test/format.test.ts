/**
 * 選択結果の整形（Issue #16）。
 *
 * 種目リストの整形はゴールデンセットのスナップショットが見ているので、
 * ここは差分表示だけを見る。
 */
import type { Coverage } from "@mtr/engine";
import { describe, expect, it } from "vitest";
import { formatCoverageDiff } from "../src/format.ts";

describe("formatCoverageDiff", () => {
  it("増減を符号付きで出す", () => {
    const diff: Coverage = { triceps_brachii: 0.18, pectoralis_major_clavicular: -0.05 };
    expect(formatCoverageDiff(diff)).toContain("上腕三頭筋 +0.18");
    expect(formatCoverageDiff(diff)).toContain("大胸筋上部 −0.05");
  });

  it("変化がなければ変化がないと書く", () => {
    // 黙って空にすると、差分が無いのか壊れたのかを読み手が区別できない。
    expect(formatCoverageDiff({})).toContain("変化なし");
  });

  it("変化のない部位は行に出さない", () => {
    expect(formatCoverageDiff({ quadriceps: 0.5, hamstrings: 0 })).not.toContain(
      "ハムストリングス",
    );
  });

  it("タキソノミーの並び順で出す", () => {
    const diff: Coverage = { quadriceps: 0.5, deltoid_anterior: 0.5 };
    const text = formatCoverageDiff(diff);
    expect(text.indexOf("三角筋前部")).toBeLessThan(text.indexOf("大腿四頭筋"));
  });

  /**
   * **`+0.00` と書くと「変化なし」と区別がつかない。**
   * 重みには 4 桁の値があるので、差が表示桁より小さくなる組は実際に存在する。
   */
  it("表示できる桁より小さい差は 0.01 未満と書く", () => {
    expect(formatCoverageDiff({ hamstrings: 0.003 })).toContain("ハムストリングス +0.01 未満");
    expect(formatCoverageDiff({ hamstrings: -0.003 })).toContain("ハムストリングス −0.01 未満");
  });

  it("+0.00 と書かない", () => {
    expect(formatCoverageDiff({ hamstrings: 0.0001 })).not.toContain("0.00");
  });
});
