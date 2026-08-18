import { describe, expect, it } from "vitest";
import { toNameJa } from "../../pipeline/naming/name-ja.ts";
import { mergeUpstream } from "../../pipeline/merge/merge.ts";
import { isTargetCategory, loadUpstream } from "../../pipeline/upstream.ts";

function ja(baseName: string): string {
  return toNameJa(baseName).nameJa;
}

describe("日本語名の合成", () => {
  it("語をカタカナに置き換えて連結する", () => {
    expect(ja("bench press")).toBe("ベンチプレス");
    expect(ja("incline bench press")).toBe("インクラインベンチプレス");
    expect(ja("bent over row")).toBe("ベントオーバーロウ");
  });

  it("冠詞は落とす", () => {
    // 「ザ」を挟むと読めない。
    expect(ja("squat to a bench")).toBe("スクワットトゥベンチ");
  });

  it("with は「付き」にする", () => {
    // 語順どおりカタカナに並べると「ベンチプレスウィズチェーン」になる。
    expect(ja("bench press with chain")).toBe("チェーン付きベンチプレス");
    expect(ja("t bar row with handle")).toBe("ハンドル付きTバーロウ");
  });

  it("辞書に無い語は未訳として返す", () => {
    const result = toNameJa("bench press with zzz");
    expect(result.missing).toEqual(["zzz"]);
  });

  it("未訳が無ければ missing は空", () => {
    expect(toNameJa("bench press").missing).toEqual([]);
  });

  it("同じ入力から同じ出力が出る", () => {
    expect(toNameJa("seated calf raise")).toEqual(toNameJa("seated calf raise"));
  });
});

describe("上流データ全件", () => {
  it("未訳の語が 1 つも無い", async () => {
    // 未訳があると「インクラインbench press」のような名前が混ざる。
    const all = (await loadUpstream()).filter(isTargetCategory);
    const missing = new Set(mergeUpstream(all).flatMap((r) => toNameJa(r.baseName).missing));
    expect([...missing]).toEqual([]);
  });

  it("全レコードに空でない日本語名が付く", async () => {
    const all = (await loadUpstream()).filter(isTargetCategory);
    for (const record of mergeUpstream(all)) {
      expect(toNameJa(record.baseName).nameJa.length, record.baseName).toBeGreaterThan(0);
    }
  });

  it("英字がそのまま残らない（頭字語を除く）", async () => {
    // T バー、JM プレス、V アップ、BOSU は英字のまま持つ。
    const all = (await loadUpstream()).filter(isTargetCategory);
    const leaked = mergeUpstream(all)
      .map((r) => toNameJa(r.baseName).nameJa)
      .filter((name) => /[a-z]/.test(name));
    expect(leaked).toEqual([]);
  });
});
