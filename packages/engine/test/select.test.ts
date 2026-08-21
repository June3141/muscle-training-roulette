/**
 * 選択エンジン（design.md §5.1、Issue #12・#13・#14）。
 *
 * 「被覆最大化」以下の各 describe は候補の絞り込みと縮退を見る。
 * ここでは種目の動作パターンを既定値のままにしてあるので、
 * **多様性項が種目数だけで決まる定数になり、カバレッジ項だけが選択を決める。**
 *
 * 並び順は §5.3 の順序付けが決めるので、選択の検査で順序に依存させない。
 * 順序付けそのものは order.test.ts。
 */
import { describe, expect, it } from "vitest";
import { selectExercises } from "../src/select.ts";
import { exercise } from "./fixtures.ts";

describe("selectExercises: 被覆最大化", () => {
  it("指定部位の重みが大きい種目から選ぶ", () => {
    const weak = exercise({ id: "weak", muscleWeights: { quadriceps: 0.2, hamstrings: 0.8 } });
    const strong = exercise({ id: "strong", muscleWeights: { quadriceps: 0.9, hamstrings: 0.1 } });
    const result = selectExercises({ targets: ["quadriceps"], count: 1 }, [weak, strong]);
    expect(result.exercises.map((s) => s.exercise.id)).toEqual(["strong"]);
  });

  it("指定していない部位の重みは選択に影響しない", () => {
    const focused = exercise({
      id: "focused",
      muscleWeights: { quadriceps: 0.5, hamstrings: 0.5 },
    });
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
    const excluded = exercise({
      id: "excluded",
      muscleWeights: { quadriceps: 1 },
      selectable: false,
    });
    const allowed = exercise({ id: "allowed", muscleWeights: { quadriceps: 0.3 } });
    const result = selectExercises({ targets: ["quadriceps"], count: 2 }, [excluded, allowed]);
    expect(result.exercises.map((s) => s.exercise.id)).toEqual(["allowed"]);
  });

  it("対象が 1 部位なら重みの大きい順に並ぶ", () => {
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

describe("selectExercises: 目的関数の項（#13）", () => {
  it("同一筋に重ねるより、対象部位に散らす組を選ぶ", () => {
    const quadA = exercise({ id: "quadA", muscleWeights: { quadriceps: 1 } });
    const quadB = exercise({ id: "quadB", muscleWeights: { quadriceps: 1 } });
    const ham = exercise({ id: "ham", muscleWeights: { hamstrings: 1 } });
    const result = selectExercises({ targets: ["quadriceps", "hamstrings"], count: 2 }, [
      quadA,
      quadB,
      ham,
    ]);
    // 何が選ばれたかだけを見る。並び順は §5.3 の順序付けが決める。
    expect(result.exercises.map((s) => s.exercise.id).toSorted()).toEqual(["ham", "quadA"]);
  });

  it("重みが少し劣っても、動作パターンの違う種目を混ぜる", () => {
    const heavy = exercise({
      id: "heavy",
      muscleWeights: { quadriceps: 0.9 },
      movementPattern: "squat",
    });
    const samePattern = exercise({
      id: "samePattern",
      muscleWeights: { quadriceps: 0.88 },
      movementPattern: "squat",
    });
    const otherPattern = exercise({
      id: "otherPattern",
      muscleWeights: { quadriceps: 0.8 },
      movementPattern: "hinge",
    });
    const result = selectExercises({ targets: ["quadriceps"], count: 2 }, [
      heavy,
      samePattern,
      otherPattern,
    ]);
    expect(result.exercises.map((s) => s.exercise.id)).toEqual(["heavy", "otherPattern"]);
  });

  /**
   * 貪欲法は 1 手目に `both` を採る（単独では最大）が、そこから 2 手目をどう選んでも
   * `quadOnly` + `hamOnly` の組には届かない。1-swap が 1 手目を差し替えて回収する。
   */
  it("貪欲法が 1 手目で外した組を 1-swap が拾う", () => {
    const both = exercise({ id: "both", muscleWeights: { quadriceps: 0.6, hamstrings: 0.4 } });
    const quadOnly = exercise({ id: "quadOnly", muscleWeights: { quadriceps: 1 } });
    const hamOnly = exercise({ id: "hamOnly", muscleWeights: { hamstrings: 1 } });
    const result = selectExercises({ targets: ["quadriceps", "hamstrings"], count: 2 }, [
      both,
      quadOnly,
      hamOnly,
    ]);
    expect(result.exercises.map((s) => s.exercise.id).toSorted()).toEqual(["hamOnly", "quadOnly"]);
  });
});

describe("selectExercises: 順序付け（#14）", () => {
  it("結果は選んだ順ではなく実行順で返る", () => {
    const curl = exercise({ id: "curl", muscleWeights: { biceps_brachii: 1 } });
    const row = exercise({ id: "row", muscleWeights: { latissimus_dorsi: 1 } });
    const result = selectExercises({ targets: ["biceps_brachii", "latissimus_dorsi"], count: 2 }, [
      curl,
      row,
    ]);
    expect(result.exercises.map((s) => s.exercise.id)).toEqual(["row", "curl"]);
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
