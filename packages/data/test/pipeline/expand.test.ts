import { describe, expect, it } from "vitest";
import { applyPrimaryOverride } from "../../pipeline/apply-overrides.ts";
import { expandMuscles } from "../../pipeline/mapping/expand.ts";
import { isTargetCategory, loadUpstream, type UpstreamExercise } from "../../pipeline/upstream.ts";

function upstream(over: Partial<UpstreamExercise> = {}): UpstreamExercise {
  return {
    id: "x",
    name: "x",
    force: null,
    level: "beginner",
    mechanic: "compound",
    equipment: "barbell",
    primaryMuscles: [],
    secondaryMuscles: [],
    instructions: [],
    category: "strength",
    images: [],
    ...over,
  };
}

describe("上流の部位をタキソノミーに展開する", () => {
  it("1 対 1 で写せるものはそのまま写す", () => {
    const result = expandMuscles(
      upstream({ primaryMuscles: ["biceps"], secondaryMuscles: ["calves", "glutes"] }),
    );
    expect(result.primary).toEqual(["biceps_brachii"]);
    expect(result.secondary).toEqual(["gluteus_maximus", "triceps_surae"]);
  });

  it("肩は動作から前部/中部/後部に割れる", () => {
    const press = expandMuscles(
      upstream({ name: "Barbell Shoulder Press", primaryMuscles: ["shoulders"] }),
    );
    expect(press.primary).toEqual(["deltoid_anterior", "deltoid_lateral"]);

    const raise = expandMuscles(
      upstream({ name: "Side Lateral Raise", primaryMuscles: ["shoulders"] }),
    );
    expect(raise.primary).toEqual(["deltoid_lateral"]);
  });

  it("胸は角度から上部/中下部に割れる", () => {
    const incline = expandMuscles(
      upstream({ name: "Barbell Incline Bench Press", primaryMuscles: ["chest"] }),
    );
    expect(incline.primary).toEqual(["pectoralis_major_clavicular"]);
  });

  it("僧帽筋は肩甲骨の動きから上部/中下部に割れる", () => {
    const shrug = expandMuscles(upstream({ name: "Barbell Shrug", primaryMuscles: ["traps"] }));
    expect(shrug.primary).toEqual(["trapezius_upper"]);

    const row = expandMuscles(
      upstream({ name: "Bent Over Barbell Row", primaryMuscles: ["traps"] }),
    );
    expect(row.primary).toEqual(["trapezius_middle_lower"]);
  });

  it("前腕は握力か肘屈曲かで割れる", () => {
    const grip = expandMuscles(
      upstream({ name: "Barbell Deadlift", primaryMuscles: ["forearms"] }),
    );
    expect(grip.primary).toEqual(["wrist_flexors"]);
  });

  it("股関節の安定筋を補助筋として補完する", () => {
    // 上流は片脚種目に中臀筋を書いていない（ADR 0005、docs/data-survey.md）。
    const lunge = expandMuscles(
      upstream({
        name: "Barbell Lunge",
        primaryMuscles: ["quadriceps"],
        secondaryMuscles: ["glutes"],
      }),
    );
    expect(lunge.secondary).toContain("gluteus_medius");
  });

  it("主働筋に入ったものを補助筋には入れない", () => {
    const result = expandMuscles(
      upstream({ name: "Barbell Shrug", primaryMuscles: ["traps"], secondaryMuscles: ["traps"] }),
    );
    expect(result.secondary).not.toContain("trapezius_upper");
  });

  it("上流の主働筋の誤りは上書きを当ててから展開する", async () => {
    // 生の値ではデッドリフトの主働筋が lower back になっていて、
    // そのまま展開すると脊柱起立筋に 0.65 が乗る（Issue #11 の警告そのもの）。
    const deadlift = (await loadUpstream()).find((ex) => ex.id === "Barbell_Deadlift");
    const result = expandMuscles(deadlift as UpstreamExercise);
    expect(result.primary).toEqual(["hamstrings", "gluteus_maximus"]);
    expect(result.secondary).toContain("erector_spinae");
  });

  it("上書きの適用は冪等（適用済みを渡しても変わらない）", async () => {
    // 統合パイプラインは先に上書きを当てている。二重に当たっても壊れないこと。
    const deadlift = (await loadUpstream()).find(
      (ex) => ex.id === "Barbell_Deadlift",
    ) as UpstreamExercise;
    expect(expandMuscles(applyPrimaryOverride(deadlift))).toEqual(expandMuscles(deadlift));
  });

  it("首は写せない理由が残る", () => {
    const result = expandMuscles(
      upstream({ name: "Seated Head Harness Neck Resistance", primaryMuscles: ["neck"] }),
    );
    expect(result.primary).toEqual([]);
    expect(result.unmapped).toEqual([
      { muscle: "neck", reason: "首はタキソノミーの対象外（ADR 0005）" },
    ]);
  });

  it("出力の並びはタキソノミーの宣言順で決まる", () => {
    // 上流の並び順に依存すると、同じ種目から違う結果が出る。
    const forward = expandMuscles(upstream({ primaryMuscles: ["triceps", "biceps"] }));
    const reverse = expandMuscles(upstream({ primaryMuscles: ["biceps", "triceps"] }));
    expect(forward.primary).toEqual(reverse.primary);
    expect(forward.primary).toEqual(["biceps_brachii", "triceps_brachii"]);
  });
});

describe("上流データ全件", () => {
  it("主働筋が空になるのは 12 件で、内訳が分かっている", async () => {
    // 空になる = muscleWeights を作れない = データセットに載せられない。
    // 黙って減るのが最悪なので、どれが落ちるかをここで固定する。
    const all = (await loadUpstream()).filter(isTargetCategory);
    const empty = all.filter((ex) => expandMuscles(ex).primary.length === 0);
    expect(empty.map((ex) => ex.name).toSorted()).toEqual([
      // 純粋なローテーターカフ種目。該当分類がない（ADR 0005）
      "Cable Internal Rotation",
      "External Rotation",
      "External Rotation with Band",
      "External Rotation with Cable",
      "Internal Rotation with Band",
      // 首はタキソノミーの対象外（ADR 0005）
      "Isometric Neck Exercise - Front And Back",
      "Isometric Neck Exercise - Sides",
      // 全身種目。特定の三角筋部位に寄せられない
      "Kettlebell Turkish Get-Up (Lunge style)",
      "Kettlebell Turkish Get-Up (Squat style)",
      "Lying Face Down Plate Neck Resistance",
      "Lying Face Up Plate Neck Resistance",
      "Seated Head Harness Neck Resistance",
    ]);
  });

  it("写せなかった部位には必ず理由が付く", async () => {
    const all = (await loadUpstream()).filter(isTargetCategory);
    for (const ex of all) {
      for (const entry of expandMuscles(ex).unmapped) {
        expect(entry.reason.length, `${ex.name} / ${entry.muscle}`).toBeGreaterThan(5);
      }
    }
  });

  it("主働筋と補助筋が重複しない", async () => {
    const all = (await loadUpstream()).filter(isTargetCategory);
    for (const ex of all) {
      const { primary, secondary } = expandMuscles(ex);
      const overlap = secondary.filter((m) => primary.includes(m));
      expect(overlap, ex.name).toEqual([]);
    }
  });
});
