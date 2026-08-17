import { describe, expect, it } from "vitest";
import { mapForearms } from "../../pipeline/mapping/forearms.ts";
import { addHipStabilizers } from "../../pipeline/mapping/hip-stabilizers.ts";
import { NOT_SELECTABLE, isSelectable } from "../../pipeline/selectable.ts";
import { isTargetCategory, loadUpstream } from "../../pipeline/upstream.ts";

function forearmOf(name: string): readonly string[] {
  return mapForearms({ name, primaryMuscles: ["forearms"] }).muscles;
}

function hipOf(name: string, primaryMuscles: readonly string[] = ["quadriceps"]) {
  return addHipStabilizers({ name, primaryMuscles, secondaryMuscles: [] })?.muscles ?? [];
}

describe("前腕: 握力か肘屈曲か", () => {
  it("リストカールは前腕屈筋群", () => {
    expect(forearmOf("Seated Palm-Up Barbell Wrist Curl")).toEqual(["wrist_flexors"]);
  });

  it("ハンマーカールは腕橈骨筋（肘屈曲）", () => {
    expect(forearmOf("Alternate Hammer Curl")).toEqual(["brachioradialis"]);
  });

  it("デッドリフトの前腕は握力なので前腕屈筋群", () => {
    expect(forearmOf("Barbell Deadlift")).toEqual(["wrist_flexors"]);
  });

  it("プレートピンチは前腕屈筋群", () => {
    expect(forearmOf("Plate Pinch")).toEqual(["wrist_flexors"]);
  });

  it("ファーマーズウォークは前腕屈筋群（保持）", () => {
    expect(forearmOf("Farmer's Walk")).toEqual(["wrist_flexors"]);
  });
});

describe("股関節の安定筋を補完する", () => {
  it("片脚種目には中臀筋を足す", () => {
    expect(hipOf("Barbell Lunge")).toEqual(["gluteus_medius"]);
  });

  it("ブルガリアンスクワットも片脚種目", () => {
    expect(hipOf("Bulgarian Split Squat")).toEqual(["gluteus_medius"]);
  });

  it("ワイドスタンスには中臀筋と内転筋を足す", () => {
    expect(hipOf("Sumo Deadlift", ["hamstrings"])).toEqual(["gluteus_medius", "adductors"]);
  });

  it("前額面の動作には中臀筋と内転筋を足す", () => {
    expect(hipOf("Side Lunge")).toEqual(["gluteus_medius", "adductors"]);
  });

  it("通常のスクワットには足さない", () => {
    expect(hipOf("Barbell Squat")).toEqual([]);
  });

  it("上半身の種目には足さない", () => {
    // 名前に「side」が入っていても下半身でなければ対象外
    expect(hipOf("Side Lateral Raise", ["shoulders"])).toEqual([]);
  });
});

describe("候補プールから外す種目", () => {
  it("ローテーターカフ種目は候補に出さない", () => {
    expect(isSelectable("External_Rotation")).toBe(false);
    expect(isSelectable("Cable_Internal_Rotation")).toBe(false);
  });

  it("通常の種目は候補に出す", () => {
    expect(isSelectable("Barbell_Bench_Press_-_Medium_Grip")).toBe(true);
  });

  it("除外理由が書かれている", () => {
    for (const [id, entry] of Object.entries(NOT_SELECTABLE)) {
      expect(entry.reason.length, id).toBeGreaterThan(10);
    }
  });

  it("除外対象の id がすべて上流に存在する", async () => {
    const ids = new Set((await loadUpstream()).map((ex) => ex.id));
    const stale = Object.keys(NOT_SELECTABLE).filter((id) => !ids.has(id));
    expect(stale).toEqual([]);
  });
});

describe("上流データ全件", () => {
  it("前腕は全件を判定できる", async () => {
    const all = (await loadUpstream()).filter(isTargetCategory);
    const withForearms = all.filter(
      (ex) => ex.primaryMuscles.includes("forearms") || ex.secondaryMuscles.includes("forearms"),
    );
    for (const ex of withForearms) {
      expect(mapForearms(ex).muscles.length, ex.name).toBeGreaterThan(0);
    }
  });

  it("中臀筋の候補が上流の 5 件から十分に増える", async () => {
    const all = (await loadUpstream()).filter(isTargetCategory);
    const added = all.filter((ex) => addHipStabilizers(ex)?.muscles.includes("gluteus_medius"));
    // 上流の abductors は 5 件しかない。補完で部位として機能する数まで増やす。
    expect(added.length).toBeGreaterThan(30);
  });
});
