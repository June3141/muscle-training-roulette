import { describe, expect, it } from "vitest";
import { applyPrimaryOverride, findStaleOverrides } from "../../pipeline/apply-overrides.ts";
import { PRIMARY_MUSCLE_OVERRIDES } from "../../pipeline/overrides/primary-muscles.ts";
import { type UpstreamExercise, isTargetCategory, loadUpstream } from "../../pipeline/upstream.ts";

function upstream(overrides: Partial<UpstreamExercise> = {}): UpstreamExercise {
  return {
    id: "Some_Exercise",
    name: "Some Exercise",
    force: "pull",
    level: "beginner",
    mechanic: "compound",
    equipment: "barbell",
    primaryMuscles: ["lower back"],
    secondaryMuscles: ["glutes", "hamstrings", "traps"],
    instructions: [],
    category: "strength",
    images: [],
    ...overrides,
  };
}

describe("applyPrimaryOverride", () => {
  it("上書き対象でない種目はそのまま返す", () => {
    const ex = upstream({ id: "Not_Overridden" });
    expect(applyPrimaryOverride(ex)).toEqual(ex);
  });

  it("primary を差し替える", () => {
    const result = applyPrimaryOverride(upstream({ id: "Barbell_Deadlift" }));
    expect(result.primaryMuscles).toEqual(["hamstrings", "glutes"]);
  });

  it("新しい primary に入ったものを secondary から取り除く", () => {
    const result = applyPrimaryOverride(upstream({ id: "Barbell_Deadlift" }));
    expect(result.secondaryMuscles).not.toContain("hamstrings");
    expect(result.secondaryMuscles).not.toContain("glutes");
  });

  it("元の primary を secondary に降ろす（関与しないことにはしない）", () => {
    const result = applyPrimaryOverride(upstream({ id: "Barbell_Deadlift" }));
    expect(result.secondaryMuscles).toContain("lower back");
  });

  it("無関係な secondary は残す", () => {
    const result = applyPrimaryOverride(upstream({ id: "Barbell_Deadlift" }));
    expect(result.secondaryMuscles).toContain("traps");
  });
});

describe("上書き定義そのもの", () => {
  it("すべての上書きに理由が書かれている", () => {
    for (const [id, override] of Object.entries(PRIMARY_MUSCLE_OVERRIDES)) {
      expect(override.reason.length, id).toBeGreaterThan(20);
    }
  });

  it("上書き後の primaryMuscles が空でない", () => {
    for (const [id, override] of Object.entries(PRIMARY_MUSCLE_OVERRIDES)) {
      expect(override.primaryMuscles.length, id).toBeGreaterThan(0);
    }
  });
});

describe("上流データとの整合性", () => {
  it("上書き定義の id がすべて上流に存在する（黙って効かなくなるのを防ぐ）", async () => {
    const all = await loadUpstream();
    expect(findStaleOverrides(all)).toEqual([]);
  });

  it("デッドリフト系の primary が揃う", async () => {
    const all = (await loadUpstream()).filter(isTargetCategory).map(applyPrimaryOverride);
    const deadlifts = all.filter(
      (ex) =>
        /\bdeadlift\b/i.test(ex.name) && !/^(Car|Rickshaw|Leverage|One-Arm Side)/i.test(ex.name),
    );

    // 上流では lower back / hamstrings / quadriceps に 3 分裂していた。
    // Car / Rickshaw / Leverage / One-Arm Side は器具の構造で動作が変わるため対象外。
    const withLowerBackPrimary = deadlifts.filter((ex) => ex.primaryMuscles.includes("lower back"));
    expect(withLowerBackPrimary.map((ex) => ex.name)).toEqual([]);
  });

  it("クローズグリップ以外のベンチプレスの primary が chest になる", async () => {
    const all = (await loadUpstream()).map(applyPrimaryOverride);
    const notCloseGrip = all.filter(
      (ex) => /\bbench press\b/i.test(ex.name) && !/close-grip|reverse triceps/i.test(ex.name),
    );

    const stillTriceps = notCloseGrip.filter((ex) => ex.primaryMuscles.includes("triceps"));
    expect(stillTriceps.map((ex) => ex.name)).toEqual([]);
  });
});
