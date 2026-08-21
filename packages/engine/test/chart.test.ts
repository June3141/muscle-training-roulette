/**
 * カバレッジのバーチャート（design.md §2、§3、Issue #16）。
 *
 * **可視化は Q1 の主計測器。** 「重み付けデータは特に効く部位を表現できるか」は
 * 数字の羅列では判断できない。ここで検査するのは、判断に要る情報が図から落ちていないこと。
 *
 * 人体図 SVG は M6（ADR 0003）。ここはバーチャートだけ。
 */
import type { Coverage } from "@mtr/engine";
import { describe, expect, it } from "vitest";
import { renderCoverageChart } from "../src/chart.ts";

const chest: Coverage = {
  pectoralis_major_sternal: 2,
  pectoralis_major_clavicular: 1,
  triceps_brachii: 0.5,
};

describe("renderCoverageChart: SVG として成立する", () => {
  it("単独で開ける SVG を返す", () => {
    const svg = renderCoverageChart(chest, ["pectoralis_major_sternal"]);
    expect(svg.startsWith("<svg")).toBe(true);
    expect(svg.trimEnd().endsWith("</svg>")).toBe(true);
    expect(svg).toContain('xmlns="http://www.w3.org/2000/svg"');
    expect(svg).toContain("viewBox=");
  });

  it("カバレッジが空でも落ちず、SVG を返す", () => {
    const svg = renderCoverageChart({}, []);
    expect(svg.startsWith("<svg")).toBe(true);
  });

  it("外部リソースを参照しない", () => {
    // xmlns の名前空間 URI は参照ではないので除いて見る。
    const svg = renderCoverageChart(chest, ["pectoralis_major_sternal"]).replaceAll(
      "http://www.w3.org/2000/svg",
      "",
    );
    expect(svg).not.toContain("http");
    expect(svg).not.toContain("<image");
    expect(svg).not.toContain("@import");
  });
});

describe("renderCoverageChart: 何を描くか", () => {
  it("カバレッジのある部位を日本語名で出す", () => {
    const svg = renderCoverageChart(chest, []);
    expect(svg).toContain("大胸筋中下部");
    expect(svg).toContain("上腕三頭筋");
  });

  it("数値を添える", () => {
    const svg = renderCoverageChart(chest, []);
    expect(svg).toContain("2.00");
    expect(svg).toContain("0.50");
  });

  /**
   * **黙って空くのは異常**（design.md §5.4）。
   * 指定したのに 0 の部位が図から消えると、要求が満たされたように見える。
   */
  it("指定した部位はカバレッジ 0 でも行が残る", () => {
    const svg = renderCoverageChart(chest, ["biceps_brachii"]);
    expect(svg).toContain("上腕二頭筋");
    expect(svg).toContain("0.00");
  });

  it("指定していないのに乗った部位も出す", () => {
    // 三頭は指定していないがベンチで乗る。波及が見えないと違和感を言語化できない。
    const svg = renderCoverageChart(chest, ["pectoralis_major_sternal"]);
    expect(svg).toContain("上腕三頭筋");
  });

  it("指定した部位とそうでない部位を区別できる", () => {
    const svg = renderCoverageChart(chest, ["pectoralis_major_sternal"]);
    expect(svg).toContain('data-target="true"');
    expect(svg).toContain('data-target="false"');
  });
});

describe("renderCoverageChart: 目盛り", () => {
  it("バーの長さは最大値に対する比になる", () => {
    const svg = renderCoverageChart({ quadriceps: 2, hamstrings: 1 }, []);
    const widths = [...svg.matchAll(/data-bar-width="([\d.]+)"/g)].map((m) => Number(m[1]));
    expect(widths).toHaveLength(2);
    expect(widths[0]).toBeCloseTo((widths[1] ?? 0) * 2, 6);
  });

  it("すべて 0 でも幅の計算で落ちない", () => {
    const svg = renderCoverageChart({}, ["quadriceps", "hamstrings"]);
    expect(svg).toContain('data-bar-width="0"');
  });
});

describe("renderCoverageChart: 並び順", () => {
  /**
   * **タキソノミーの並び順で固定する。** 値の降順にすると、重みを 1 件触るだけで
   * 行が入れ替わり、スナップショットの差分から何が変わったかを読めなくなる。
   */
  it("タキソノミーの並び順で安定する", () => {
    const svg = renderCoverageChart({ quadriceps: 1, deltoid_anterior: 1 }, []);
    expect(svg.indexOf("三角筋前部")).toBeLessThan(svg.indexOf("大腿四頭筋"));
  });

  it("同じ入力から同じ出力が出る", () => {
    const targets = ["pectoralis_major_sternal", "biceps_brachii"] as const;
    expect(renderCoverageChart(chest, targets)).toBe(renderCoverageChart(chest, targets));
  });
});

describe("renderCoverageChart: 図が嘘をつかないこと", () => {
  /**
   * 腹横筋は体表に領域が無い（ADR 0003）。人体図には出せないが、
   * **バーチャートには出す。** ここで落とすと図とデータの分解能が食い違う。
   */
  it("人体図に出せない部位もバーチャートには出す", () => {
    const svg = renderCoverageChart({ transversus_abdominis: 0.4 }, []);
    expect(svg).toContain("腹横筋");
  });

  it("文字列を埋め込むときにエスケープする", () => {
    // 部位名は固定値だが、値の書式が壊れたときに XML が壊れないことを保証する。
    const svg = renderCoverageChart(chest, []);
    expect(svg).not.toMatch(/<text[^>]*>[^<]*[<&][^<]*<\/text>/);
  });
});
