import { describe, expect, it } from "vitest";
import { ABDOMINAL_OVERRIDES } from "../../pipeline/mapping/abdominal-overrides.ts";
import { mapAbdominals } from "../../pipeline/mapping/abdominals.ts";
import { mapChest } from "../../pipeline/mapping/chest.ts";
import { isTargetCategory, loadUpstream } from "../../pipeline/upstream.ts";

function chestOf(name: string): readonly string[] {
  return mapChest({ name, force: "push", primaryMuscles: ["chest"] }).muscles;
}

function absOf(
  name: string,
  primaryMuscles: readonly string[] = ["abdominals"],
): readonly string[] {
  const result = mapAbdominals({ id: "Test_Exercise", name, primaryMuscles });
  return result?.muscles ?? [];
}

describe("大胸筋: 角度で決まる", () => {
  it("インクラインベンチプレスは上部", () => {
    expect(chestOf("Barbell Incline Bench Press - Medium Grip")).toEqual([
      "pectoralis_major_clavicular",
    ]);
  });

  it("デクラインベンチプレスは中下部", () => {
    expect(chestOf("Decline Barbell Bench Press")).toEqual(["pectoralis_major_sternal"]);
  });

  it("フラットベンチプレスは中下部", () => {
    expect(chestOf("Barbell Bench Press - Medium Grip")).toEqual(["pectoralis_major_sternal"]);
  });
});

describe("大胸筋: プッシュアップは incline / decline の意味が逆になる", () => {
  // instructions で確認済み。
  // Decline Push-Up は「足を高くする」ので上体が前傾し、インクラインプレスと同じ角度になる。
  // Incline Push-Up は「手を高くする」ので上体が後傾し、デクラインプレスと同じ角度になる。
  it("デクラインプッシュアップは上部（ベンチプレスと逆）", () => {
    expect(chestOf("Decline Push-Up")).toEqual(["pectoralis_major_clavicular"]);
  });

  it("インクラインプッシュアップは中下部（ベンチプレスと逆）", () => {
    expect(chestOf("Incline Push-Up")).toEqual(["pectoralis_major_sternal"]);
  });

  it("通常のプッシュアップは中下部", () => {
    expect(chestOf("Pushups")).toEqual(["pectoralis_major_sternal"]);
  });
});

describe("腹筋: 体幹に何をさせているかで決まる", () => {
  it("クランチは腹直筋（屈曲）", () => {
    expect(absOf("Cable Crunch")).toEqual(["rectus_abdominis"]);
  });

  it("ロシアンツイストは腹斜筋（回旋）", () => {
    expect(absOf("Cable Russian Twists")).toEqual(["obliques"]);
  });

  it("プランクは腹横筋（姿勢保持）", () => {
    expect(absOf("Plank")).toEqual(["transversus_abdominis"]);
  });

  it("アブロールアウトは腹横筋（アンチ伸展）", () => {
    expect(absOf("Barbell Ab Rollout")).toEqual(["transversus_abdominis"]);
  });
});

describe("腹筋: ルールの適用順", () => {
  it("サイドクランチは腹直筋ではなく腹斜筋", () => {
    // 「crunch」にも当たるが、回旋・側屈のパターンを先に置いている
    expect(absOf("Decline Oblique Crunch")).toEqual(["obliques"]);
  });

  it("サイドプランクは腹横筋ではなく腹斜筋", () => {
    expect(absOf("Side Plank")).toEqual(["obliques"]);
  });
});

describe("腹筋: 補助として入っている場合", () => {
  it("他部位の種目の腹筋は腹横筋（体幹の固定）", () => {
    expect(absOf("Barbell Squat", ["quadriceps"])).toEqual(["transversus_abdominis"]);
  });

  it("腹筋が主働筋なのに判別できないものは個別判断に回す", () => {
    expect(
      mapAbdominals({ id: "Unknown", name: "Mystery Core Move", primaryMuscles: ["abdominals"] }),
    ).toBeNull();
  });
});

describe("上流データ全件の写像", () => {
  it("大胸筋は全件を判定できる", async () => {
    const all = (await loadUpstream()).filter(isTargetCategory);
    const withChest = all.filter(
      (ex) => ex.primaryMuscles.includes("chest") || ex.secondaryMuscles.includes("chest"),
    );
    for (const ex of withChest) {
      expect(mapChest(ex).muscles.length, ex.name).toBeGreaterThan(0);
    }
  });

  it("腹筋に判定できない種目が残っていない", async () => {
    const all = (await loadUpstream()).filter(isTargetCategory);
    const withAbs = all.filter(
      (ex) =>
        ex.primaryMuscles.includes("abdominals") || ex.secondaryMuscles.includes("abdominals"),
    );

    const unresolved = withAbs.filter((ex) => mapAbdominals(ex) === null);
    // 上流に新しい種目が入ったらここが落ちる。落ちたらルールか手動判定を足す。
    expect(unresolved.map((ex) => `${ex.id} (${ex.name})`)).toEqual([]);
  });

  it("手動判定の id がすべて上流に存在する", async () => {
    const ids = new Set((await loadUpstream()).map((ex) => ex.id));
    const stale = Object.keys(ABDOMINAL_OVERRIDES).filter((id) => !ids.has(id));
    expect(stale).toEqual([]);
  });

  it("手動判定に理由が書かれている", () => {
    for (const [id, override] of Object.entries(ABDOMINAL_OVERRIDES)) {
      expect(override.reason.length, id).toBeGreaterThan(10);
      expect(override.muscles.length, id).toBeGreaterThan(0);
    }
  });
});
