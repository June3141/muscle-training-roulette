import { describe, expect, it } from "vitest";
import { datasetSchema, exerciseSchema, type Exercise } from "../src/schema.ts";

function validExercise(overrides: Partial<Exercise> = {}): unknown {
  return {
    id: "barbell_bench_press",
    sourceId: "Barbell_Bench_Press_-_Medium_Grip",
    nameEn: "Barbell Bench Press",
    nameJa: "バーベルベンチプレス",
    force: "push",
    mechanic: "compound",
    level: "beginner",
    category: "strength",
    movementPattern: "horizontal_press",
    equipmentOptions: ["barbell", "dumbbell", "smith", "machine"],
    defaultEquipment: "barbell",
    lateralityOptions: ["bilateral"],
    defaultLaterality: "bilateral",
    muscleWeights: {
      pectoralis_major_sternal: 0.45,
      pectoralis_major_clavicular: 0.15,
      triceps_brachii: 0.25,
      deltoid_anterior: 0.15,
    },
    ...overrides,
  };
}

describe("exerciseSchema", () => {
  it("design.md §4.2 の例を受理する", () => {
    expect(exerciseSchema.safeParse(validExercise()).success).toBe(true);
  });

  it("muscleWeights の合計が 1.0 でないものを弾く", () => {
    const result = exerciseSchema.safeParse(
      validExercise({
        muscleWeights: { pectoralis_major_sternal: 0.5, triceps_brachii: 0.3 },
      }),
    );
    expect(result.success).toBe(false);
    expect(JSON.stringify(result.error?.issues)).toContain("合計が 1.0");
  });

  it("浮動小数点の丸め誤差は許容する", () => {
    // 1/3 を 3 つ足すと 1 にならないが、これは弾いてはいけない
    const third = 1 / 3;
    const result = exerciseSchema.safeParse(
      validExercise({
        muscleWeights: {
          pectoralis_major_sternal: third,
          triceps_brachii: third,
          deltoid_anterior: third,
        },
      }),
    );
    expect(result.success).toBe(true);
  });

  it("タキソノミーに存在しない筋肉名を弾く", () => {
    const result = exerciseSchema.safeParse(
      validExercise({ muscleWeights: { chest: 1.0 } as never }),
    );
    expect(result.success).toBe(false);
  });

  it("重みが 0 のエントリを弾く（書かないのと区別がつかないため）", () => {
    const result = exerciseSchema.safeParse(
      validExercise({
        muscleWeights: { pectoralis_major_sternal: 1.0, triceps_brachii: 0 },
      }),
    );
    expect(result.success).toBe(false);
  });

  it("defaultEquipment が equipmentOptions に含まれていないものを弾く", () => {
    const result = exerciseSchema.safeParse(
      validExercise({ equipmentOptions: ["dumbbell"], defaultEquipment: "barbell" }),
    );
    expect(result.success).toBe(false);
    expect(JSON.stringify(result.error?.issues)).toContain("defaultEquipment");
  });

  it("defaultLaterality が lateralityOptions に含まれていないものを弾く", () => {
    const result = exerciseSchema.safeParse(
      validExercise({ lateralityOptions: ["bilateral"], defaultLaterality: "unilateral" }),
    );
    expect(result.success).toBe(false);
  });

  it("mechanic が欠損していても受理する（上流に 87 件ある）", () => {
    expect(exerciseSchema.safeParse(validExercise({ mechanic: null })).success).toBe(true);
  });

  it("id が snake_case でないものを弾く", () => {
    const result = exerciseSchema.safeParse(validExercise({ id: "Barbell_Bench_Press" }));
    expect(result.success).toBe(false);
  });
});

describe("datasetSchema", () => {
  it("id の重複を検出する", () => {
    const result = datasetSchema.safeParse([validExercise(), validExercise()]);
    expect(result.success).toBe(false);
    expect(JSON.stringify(result.error?.issues)).toContain("重複");
  });

  it("id が一意なら受理する", () => {
    const result = datasetSchema.safeParse([
      validExercise(),
      validExercise({ id: "dumbbell_bench_press" }),
    ]);
    expect(result.success).toBe(true);
  });
});

describe("器具とグリップの組み合わせ検証（Q2）", () => {
  // design.md §2 Q2「器具・グリップを独立軸として扱えるか」の検証項目。
  // 無効な組み合わせが検出でき、有効なものだけが生成されることを担保する。
  it.todo("スミスマシンは unilateral を選べない");
  it.todo("ケーブルは bilateral / unilateral の両方を選べる");
  it.todo("自重種目は器具の付け替えができない");
});
