import { describe, expect, it } from "vitest";
import { mapBack } from "../../pipeline/mapping/back.ts";
import { isTargetCategory, loadUpstream } from "../../pipeline/upstream.ts";

function trapsOf(name: string, force: string | null = "pull"): readonly string[] {
  return mapBack("traps", { name, force })?.muscles ?? [];
}

describe("1 対 1 で写せる部位", () => {
  it("lats は広背筋", () => {
    expect(mapBack("lats", { name: "Pullups", force: "pull" })?.muscles).toEqual([
      "latissimus_dorsi",
    ]);
  });

  it("lower back は脊柱起立筋", () => {
    expect(mapBack("lower back", { name: "Hyperextensions", force: "pull" })?.muscles).toEqual([
      "erector_spinae",
    ]);
  });

  it("middle back は僧帽筋中下部（菱形筋を含む）", () => {
    expect(mapBack("middle back", { name: "Bent Over Row", force: "pull" })?.muscles).toEqual([
      "trapezius_middle_lower",
    ]);
  });

  it("背中以外の部位は写像しない", () => {
    expect(mapBack("chest", { name: "Bench Press", force: "push" })).toBeNull();
  });
});

describe("僧帽筋: 肩甲骨に何をさせているかで決まる", () => {
  it("シュラッグは上部（肩甲骨挙上）", () => {
    expect(trapsOf("Barbell Shrug")).toEqual(["trapezius_upper"]);
  });

  it("ロウは中下部（肩甲骨内転）", () => {
    expect(trapsOf("Bent Over Barbell Row")).toEqual(["trapezius_middle_lower"]);
  });

  it("バンドプルアパートは中下部", () => {
    expect(trapsOf("Band Pull Apart")).toEqual(["trapezius_middle_lower"]);
  });

  it("デッドリフトは上部（等尺性の支持）", () => {
    expect(trapsOf("Barbell Deadlift")).toEqual(["trapezius_upper"]);
  });

  it("ファーマーズウォークは上部（保持・運搬）", () => {
    expect(trapsOf("Farmer's Walk")).toEqual(["trapezius_upper"]);
  });

  it("オーバーヘッドプレスは上部（肩甲骨の上方回旋）", () => {
    expect(trapsOf("Standing Military Press", "push")).toEqual(["trapezius_upper"]);
  });
});

describe("僧帽筋: ルールの適用順", () => {
  it("アップライトロウは中下部ではなく上部", () => {
    // 「row」にも当たるが、挙上を伴うので上部。アップライトのパターンを先に置いている
    expect(trapsOf("Upright Barbell Row")).toEqual(["trapezius_upper"]);
  });

  it("ベントオーバーラテラルレイズは上部ではなく中下部", () => {
    // 「raise」にも当たるが、肩甲骨内転が主目的なので中下部
    expect(trapsOf("Bent Over Low-Pulley Side Lateral")).toEqual(["trapezius_middle_lower"]);
  });
});

describe("上流データ全件の写像", () => {
  it("背中の 4 部位すべてを判定できる", async () => {
    const all = (await loadUpstream()).filter(isTargetCategory);
    const unresolved: string[] = [];

    for (const ex of all) {
      for (const muscle of ["lats", "lower back", "middle back", "traps"]) {
        const hasMuscle =
          ex.primaryMuscles.includes(muscle) || ex.secondaryMuscles.includes(muscle);
        if (hasMuscle && mapBack(muscle, ex) === null) {
          unresolved.push(`${ex.id} (${muscle})`);
        }
      }
    }

    expect(unresolved).toEqual([]);
  });

  it("僧帽筋が上部と中下部の両方に振り分けられている", async () => {
    const all = (await loadUpstream()).filter(isTargetCategory);
    const withTraps = all.filter(
      (ex) => ex.primaryMuscles.includes("traps") || ex.secondaryMuscles.includes("traps"),
    );

    const upper = withTraps.filter((ex) =>
      mapBack("traps", ex)?.muscles.includes("trapezius_upper"),
    );
    const middleLower = withTraps.filter((ex) =>
      mapBack("traps", ex)?.muscles.includes("trapezius_middle_lower"),
    );

    // どちらかに全部寄ってしまうと分類として機能しない
    expect(upper.length).toBeGreaterThan(0);
    expect(middleLower.length).toBeGreaterThan(0);
  });
});
