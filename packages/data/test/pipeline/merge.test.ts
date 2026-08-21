import { describe, expect, it } from "vitest";
import { validCombinations } from "../../src/combinations.ts";
import { normalizeBaseName } from "../../pipeline/merge/base-name.ts";
import { resolveEquipment, resolveLaterality } from "../../pipeline/merge/axes.ts";
import { mergeUpstream } from "../../pipeline/merge/merge.ts";
import { isTargetCategory, loadUpstream, type UpstreamExercise } from "../../pipeline/upstream.ts";

function upstream(name: string, over: Partial<UpstreamExercise> = {}): UpstreamExercise {
  return {
    id: name.replaceAll(" ", "_"),
    name,
    force: "push",
    level: "beginner",
    mechanic: "compound",
    equipment: "barbell",
    primaryMuscles: ["chest"],
    secondaryMuscles: [],
    instructions: [],
    category: "strength",
    images: [],
    ...over,
  };
}

describe("ベース名の正規化", () => {
  it("器具名を落とす", () => {
    for (const name of [
      "Barbell Bench Press - Medium Grip",
      "Dumbbell Bench Press",
      "Machine Bench Press",
      "Smith Machine Bench Press",
    ]) {
      expect(normalizeBaseName(name), name).toBe("bench press");
    }
  });

  it("片手/両手の語を落とす", () => {
    for (const name of [
      "One-Arm Dumbbell Row",
      "Two-Arm Kettlebell Row",
      "Alternating Kettlebell Row",
    ]) {
      expect(normalizeBaseName(name), name).toBe("row");
    }
  });

  it("複数形をならす", () => {
    expect(normalizeBaseName("Cable Shrugs")).toBe("shrug");
    expect(normalizeBaseName("Barbell Shrug")).toBe("shrug");
  });

  it("単数形が s で終わる語を削らない", () => {
    // 素朴に末尾の s を落とすと press が pres、Atlas が Atla になる。
    expect(normalizeBaseName("Pin Presses")).toBe("pin press");
    expect(normalizeBaseName("Atlas Stones")).toBe("atlas stone");
    expect(normalizeBaseName("Circus Bell")).toBe("circus bell");
    expect(normalizeBaseName("Moving Claw Series")).toBe("moving claw series");
  });

  it("筋肉名の修飾を落とす", () => {
    // 「Bicep Curl」と「Curl」は同じ種目。
    expect(normalizeBaseName("Machine Bicep Curl")).toBe("curl");
    expect(normalizeBaseName("EZ-Bar Curl")).toBe("curl");
  });

  /**
   * プレスでは筋肉名が動作そのものを決める。
   * **落とすと `Lying Triceps Press` が `Seated Dumbbell Press` と同じ形になり、
   * 名前からは動作パターンを分けられなくなる。**
   */
  it("プレスでは筋肉名を落とさない", () => {
    expect(normalizeBaseName("Lying Triceps Press")).toBe("lying triceps press");
    expect(normalizeBaseName("Seated Triceps Press")).toBe("seated triceps press");
    expect(normalizeBaseName("Body Tricep Press")).toBe("body tricep press");
  });

  it("角度とグリップは残す（別種目なので畳まない）", () => {
    expect(normalizeBaseName("Decline Barbell Bench Press")).toBe("decline bench press");
    expect(normalizeBaseName("Close-Grip Barbell Bench Press")).toBe("close grip bench press");
    expect(normalizeBaseName("Wide-Grip Lat Pulldown")).toBe("wide grip lat pulldown");
  });

  it("姿勢は残す", () => {
    expect(normalizeBaseName("Seated Dumbbell Curl")).toBe("seated curl");
    expect(normalizeBaseName("Standing Dumbbell Calf Raise")).toBe("standing calf raise");
  });

  it("末尾に助詞だけが残らない", () => {
    // 「Squats - With Bands」から器具を落とすと「squat with」になってしまう
    expect(normalizeBaseName("Squats - With Bands")).toBe("squat");
    expect(normalizeBaseName("Squat with Bands")).toBe("squat");
  });
});

describe("器具の判定", () => {
  it("名前にスミスとあれば smith（上流は machine と書いている）", () => {
    expect(resolveEquipment(upstream("Smith Machine Bench Press", { equipment: "machine" }))).toBe(
      "smith",
    );
  });

  it("ランドマイン系は landmine（上流は barbell と書いている）", () => {
    for (const name of [
      "One-Arm Long Bar Row",
      "Landmine Linear Jammer",
      "T-Bar Row with Handle",
    ]) {
      expect(resolveEquipment(upstream(name, { equipment: "barbell" })), name).toBe("landmine");
    }
  });

  it("T バーでもマシンならマシンのまま", () => {
    expect(resolveEquipment(upstream("Lying T-Bar Row", { equipment: "machine" }))).toBe("machine");
  });

  it("上流の表記ゆれを正規化する", () => {
    expect(resolveEquipment(upstream("x", { equipment: "kettlebells" }))).toBe("kettlebell");
    expect(resolveEquipment(upstream("x", { equipment: "e-z curl bar" }))).toBe("ez_curl_bar");
    expect(resolveEquipment(upstream("x", { equipment: "body only" }))).toBe("body_only");
  });

  it("器具が欠損しているものは other", () => {
    expect(resolveEquipment(upstream("x", { equipment: null }))).toBe("other");
  });
});

describe("片手/両手の判定", () => {
  it("名前が片手を示していれば unilateral", () => {
    for (const name of [
      "One-Arm Dumbbell Row",
      "Single-Leg Leg Extension",
      "Alternating Hang Clean",
    ]) {
      expect(resolveLaterality(upstream(name)), name).toBe("unilateral");
    }
  });

  it("示していなければ bilateral", () => {
    expect(resolveLaterality(upstream("Barbell Bench Press"))).toBe("bilateral");
    expect(resolveLaterality(upstream("Two-Arm Kettlebell Row"))).toBe("bilateral");
  });
});

describe("種目の統合", () => {
  it("主働筋が一致するものを 1 レコードに畳む", () => {
    const merged = mergeUpstream([
      upstream("Barbell Bench Press - Medium Grip"),
      upstream("Dumbbell Bench Press", { equipment: "dumbbell" }),
      upstream("One Arm Dumbbell Bench Press", { equipment: "dumbbell" }),
    ]);
    expect(merged).toHaveLength(1);
    expect(merged[0]?.equipmentOptions).toEqual(["barbell", "dumbbell"]);
    expect(merged[0]?.lateralityOptions).toEqual(["bilateral", "unilateral"]);
    expect(merged[0]?.sourceIds).toHaveLength(3);
  });

  it("主働筋が違えば畳まない（ADR 0002）", () => {
    const merged = mergeUpstream([
      upstream("Barbell Bench Press - Medium Grip", { primaryMuscles: ["chest"] }),
      upstream("Close-Grip Barbell Bench Press", { primaryMuscles: ["triceps"] }),
    ]);
    expect(merged).toHaveLength(2);
  });

  it("同じベース名でも主働筋が割れれば別レコードになる", () => {
    const merged = mergeUpstream([
      upstream("Smith Machine Upright Row", { equipment: "machine", primaryMuscles: ["traps"] }),
      upstream("Upright Barbell Row", { primaryMuscles: ["shoulders"] }),
    ]);
    expect(merged).toHaveLength(2);
    expect(merged.map((m) => m.baseName)).toEqual(["upright row", "upright row"]);
  });

  it("既定値は有効な組み合わせの先頭を採る", () => {
    const merged = mergeUpstream([
      upstream("Barbell Bench Press - Medium Grip"),
      upstream("One Arm Dumbbell Bench Press", { equipment: "dumbbell" }),
    ]);
    // バーベル × 片手は無効なので、既定は barbell × bilateral。
    expect(merged[0]?.defaultEquipment).toBe("barbell");
    expect(merged[0]?.defaultLaterality).toBe("bilateral");
  });

  it("片手しかない上半身種目でも有効な器具を既定に選ぶ", () => {
    const merged = mergeUpstream([
      upstream("One Arm Floor Press", { primaryMuscles: ["triceps"] }),
      upstream("One-Arm Dumbbell Floor Press", {
        equipment: "dumbbell",
        primaryMuscles: ["triceps"],
      }),
    ]);
    expect(merged[0]?.defaultEquipment).toBe("dumbbell");
    expect(merged[0]?.defaultLaterality).toBe("unilateral");
  });

  it("下半身は片脚でもバーを使える", () => {
    const merged = mergeUpstream([
      upstream("One Leg Barbell Squat", { primaryMuscles: ["quadriceps"] }),
    ]);
    expect(merged[0]?.defaultEquipment).toBe("barbell");
    expect(merged[0]?.defaultLaterality).toBe("unilateral");
  });
});

describe("上流データ全件", () => {
  it("統合しても上流の全件がどこかのレコードに残る", async () => {
    const all = (await loadUpstream()).filter(isTargetCategory);
    const merged = mergeUpstream(all);
    const covered = new Set(merged.flatMap((m) => m.sourceIds));
    expect(covered.size).toBe(all.length);
  });

  it("同じ上流 id が 2 レコードに現れない", async () => {
    const all = (await loadUpstream()).filter(isTargetCategory);
    const seen = new Set<string>();
    const dup: string[] = [];
    for (const sourceId of mergeUpstream(all).flatMap((m) => m.sourceIds)) {
      if (seen.has(sourceId)) dup.push(sourceId);
      seen.add(sourceId);
    }
    expect(dup).toEqual([]);
  });

  it("統合が実際に起きている", async () => {
    const all = (await loadUpstream()).filter(isTargetCategory);
    const merged = mergeUpstream(all);
    expect(merged.length).toBeLessThan(all.length - 80);
    expect(merged.length).toBeGreaterThan(500);
  });

  it("有効な組み合わせが 0 件のレコードを作らない", async () => {
    const all = (await loadUpstream()).filter(isTargetCategory);
    const empty = mergeUpstream(all).filter((m) => validCombinations(m).length === 0);
    expect(empty.map((m) => m.baseName)).toEqual([]);
  });

  it("既定値が必ず選択肢に含まれる", async () => {
    const all = (await loadUpstream()).filter(isTargetCategory);
    for (const m of mergeUpstream(all)) {
      expect(m.equipmentOptions, m.baseName).toContain(m.defaultEquipment);
      expect(m.lateralityOptions, m.baseName).toContain(m.defaultLaterality);
    }
  });
});
