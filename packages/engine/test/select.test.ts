/**
 * 選択エンジンの貪欲法（design.md §5.1、Issue #12）。
 *
 * ここで検査するのは **単純な被覆最大化** だけ。多様性・重複ペナルティ・複合種目優先は #13。
 *
 * 目的関数がモジュラ（各種目の対象筋重み和の単純合計）なので、
 * **この段階の貪欲法は近似ではなく厳密解になる**（最適解 = 上位 k 件）。
 * 近似の話が出てくるのは #13 で凹関数を入れてから。
 */
import type { Exercise, MuscleId } from "@mtr/data";
import { describe, expect, it } from "vitest";
import { selectExercises } from "../src/select.ts";

let counter = 0;

/** 検査に効く軸だけ指定する種目ファクトリ。それ以外はスキーマを満たす固定値。 */
function exercise(over: {
  readonly id?: string;
  readonly muscleWeights: Partial<Record<MuscleId, number>>;
  readonly equipmentOptions?: readonly Exercise["defaultEquipment"][];
  readonly movementPattern?: Exercise["movementPattern"];
  readonly selectable?: boolean;
}): Exercise {
  counter += 1;
  const equipmentOptions = over.equipmentOptions ?? ["barbell"];
  return {
    id: over.id ?? `ex_${counter}`,
    sourceIds: [`Src_${counter}`],
    nameEn: `Exercise ${counter}`,
    nameJa: `種目 ${counter}`,
    force: "push",
    mechanic: "compound",
    level: "beginner",
    category: "strength",
    movementPattern: over.movementPattern ?? "horizontal_press",
    equipmentOptions,
    defaultEquipment: equipmentOptions[0] ?? "barbell",
    lateralityOptions: ["bilateral"],
    defaultLaterality: "bilateral",
    selectable: over.selectable ?? true,
    muscleWeights: over.muscleWeights,
  };
}

describe("selectExercises: 被覆最大化", () => {
  it("指定部位の重みが大きい種目から選ぶ", () => {
    const weak = exercise({ id: "weak", muscleWeights: { quadriceps: 0.2, hamstrings: 0.8 } });
    const strong = exercise({ id: "strong", muscleWeights: { quadriceps: 0.9, hamstrings: 0.1 } });
    const result = selectExercises({ targets: ["quadriceps"], count: 1 }, [weak, strong]);
    expect(result.exercises.map((s) => s.exercise.id)).toEqual(["strong"]);
  });

  it("指定していない部位の重みは選択に影響しない", () => {
    const focused = exercise({ id: "focused", muscleWeights: { quadriceps: 0.5, hamstrings: 0.5 } });
    const diluted = exercise({
      id: "diluted",
      muscleWeights: { quadriceps: 0.4, triceps_brachii: 0.6 },
    });
    const result = selectExercises({ targets: ["quadriceps", "hamstrings"], count: 1 }, [
      diluted,
      focused,
    ]);
    expect(result.exercises.map((s) => s.exercise.id)).toEqual(["focused"]);
  });

  it("同じ種目を 2 回選ばない", () => {
    const only = exercise({ id: "only", muscleWeights: { quadriceps: 1 } });
    const other = exercise({ id: "other", muscleWeights: { quadriceps: 0.1 } });
    const result = selectExercises({ targets: ["quadriceps"], count: 2 }, [only, other]);
    expect(result.exercises.map((s) => s.exercise.id)).toEqual(["only", "other"]);
  });

  it("指定部位に一切かからない種目は選ばない", () => {
    const hit = exercise({ id: "hit", muscleWeights: { quadriceps: 1 } });
    const miss = exercise({ id: "miss", muscleWeights: { triceps_brachii: 1 } });
    const result = selectExercises({ targets: ["quadriceps"], count: 5 }, [miss, hit]);
    expect(result.exercises.map((s) => s.exercise.id)).toEqual(["hit"]);
  });

  it("selectable: false の種目は候補に出さない", () => {
    const excluded = exercise({ id: "excluded", muscleWeights: { quadriceps: 1 }, selectable: false });
    const allowed = exercise({ id: "allowed", muscleWeights: { quadriceps: 0.3 } });
    const result = selectExercises({ targets: ["quadriceps"], count: 2 }, [excluded, allowed]);
    expect(result.exercises.map((s) => s.exercise.id)).toEqual(["allowed"]);
  });

  it("モジュラなので上位 k 件と一致する（この段階では貪欲法が厳密解）", () => {
    const pool = [0.9, 0.1, 0.7, 0.3, 0.5].map((w, index) =>
      exercise({ id: `w${index}`, muscleWeights: { quadriceps: w } }),
    );
    const result = selectExercises({ targets: ["quadriceps"], count: 3 }, pool);
    expect(result.exercises.map((s) => s.exercise.id)).toEqual(["w0", "w2", "w4"]);
  });
});

describe("selectExercises: 器具フィルタ", () => {
  it("許可されていない器具しか持たない種目を除外する", () => {
    const barbell = exercise({
      id: "barbell",
      muscleWeights: { quadriceps: 1 },
      equipmentOptions: ["barbell"],
    });
    const dumbbell = exercise({
      id: "dumbbell",
      muscleWeights: { quadriceps: 0.4 },
      equipmentOptions: ["dumbbell"],
    });
    const result = selectExercises(
      { targets: ["quadriceps"], count: 2, allowedEquipment: ["dumbbell"] },
      [barbell, dumbbell],
    );
    expect(result.exercises.map((s) => s.exercise.id)).toEqual(["dumbbell"]);
  });

  it("選ばれた器具は必ず許可された器具の中から選ばれる", () => {
    const multi = exercise({
      id: "multi",
      muscleWeights: { quadriceps: 1 },
      equipmentOptions: ["barbell", "dumbbell"],
    });
    const result = selectExercises(
      { targets: ["quadriceps"], count: 1, allowedEquipment: ["dumbbell"] },
      [multi],
    );
    expect(result.exercises[0]?.equipment).toBe("dumbbell");
  });

  it("既定の器具が許可されているならそれを使う", () => {
    const multi = exercise({
      id: "multi",
      muscleWeights: { quadriceps: 1 },
      equipmentOptions: ["barbell", "dumbbell"],
    });
    const result = selectExercises(
      { targets: ["quadriceps"], count: 1, allowedEquipment: ["dumbbell", "barbell"] },
      [multi],
    );
    expect(result.exercises[0]?.equipment).toBe("barbell");
  });

  it("allowedEquipment を省略したら制限しない", () => {
    const barbell = exercise({ id: "barbell", muscleWeights: { quadriceps: 1 } });
    const result = selectExercises({ targets: ["quadriceps"], count: 1 }, [barbell]);
    expect(result.exercises[0]?.equipment).toBe("barbell");
  });
});

describe("selectExercises: uncovered", () => {
  it("候補が無い部位を uncovered に入れる", () => {
    const quad = exercise({ id: "quad", muscleWeights: { quadriceps: 1 } });
    const result = selectExercises({ targets: ["quadriceps", "biceps_brachii"], count: 2 }, [quad]);
    expect(result.uncovered).toEqual(["biceps_brachii"]);
  });

  it("部位数 > 種目数でも落ちず、埋まらなかった部位を返す（§5.4）", () => {
    const pool = (["quadriceps", "hamstrings", "biceps_brachii"] as const).map((muscle) =>
      exercise({ id: muscle, muscleWeights: { [muscle]: 1 } }),
    );
    const result = selectExercises(
      { targets: ["quadriceps", "hamstrings", "biceps_brachii"], count: 1 },
      pool,
    );
    expect(result.exercises).toHaveLength(1);
    expect(result.uncovered).toHaveLength(2);
  });

  it("すべて埋まったら uncovered は空", () => {
    const both = exercise({ id: "both", muscleWeights: { quadriceps: 0.5, hamstrings: 0.5 } });
    const result = selectExercises({ targets: ["quadriceps", "hamstrings"], count: 1 }, [both]);
    expect(result.uncovered).toEqual([]);
  });

  it("secondary で薄くかかっているだけでも uncovered には入れない", () => {
    const mostlyQuad = exercise({
      id: "mostlyQuad",
      muscleWeights: { quadriceps: 0.95, gluteus_medius: 0.05 },
    });
    const result = selectExercises({ targets: ["quadriceps", "gluteus_medius"], count: 1 }, [
      mostlyQuad,
    ]);
    expect(result.uncovered).toEqual([]);
  });
});

describe("selectExercises: 枯渇と縮退", () => {
  it("候補が種目数に足りなければ、あるだけ返す", () => {
    const only = exercise({ id: "only", muscleWeights: { quadriceps: 1 } });
    const result = selectExercises({ targets: ["quadriceps"], count: 5 }, [only]);
    expect(result.exercises).toHaveLength(1);
  });

  it("データセットが空でも落ちない", () => {
    const result = selectExercises({ targets: ["quadriceps"], count: 3 }, []);
    expect(result.exercises).toEqual([]);
    expect(result.uncovered).toEqual(["quadriceps"]);
    expect(result.coverage).toEqual({});
  });

  it("部位を指定しなければ何も選ばない", () => {
    const quad = exercise({ id: "quad", muscleWeights: { quadriceps: 1 } });
    const result = selectExercises({ targets: [], count: 3 }, [quad]);
    expect(result.exercises).toEqual([]);
    expect(result.uncovered).toEqual([]);
  });

  it("器具フィルタで候補が全滅しても落ちない（§5.4）", () => {
    const barbell = exercise({ id: "barbell", muscleWeights: { quadriceps: 1 } });
    const result = selectExercises(
      { targets: ["quadriceps"], count: 3, allowedEquipment: ["body_only"] },
      [barbell],
    );
    expect(result.exercises).toEqual([]);
    expect(result.uncovered).toEqual(["quadriceps"]);
  });
});

describe("selectExercises: coverage", () => {
  it("coverage は選ばれた種目の重みの合計（指定外の部位も含む）", () => {
    const a = exercise({ id: "a", muscleWeights: { quadriceps: 0.7, gluteus_maximus: 0.3 } });
    const b = exercise({ id: "b", muscleWeights: { quadriceps: 0.5, hamstrings: 0.5 } });
    const result = selectExercises({ targets: ["quadriceps"], count: 2 }, [a, b]);
    expect(result.coverage).toEqual({ quadriceps: 1.2, gluteus_maximus: 0.3, hamstrings: 0.5 });
  });
});
