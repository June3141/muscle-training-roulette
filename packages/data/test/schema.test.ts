import { describe, expect, it } from "vitest";
import { datasetSchema, exerciseSchema, type Exercise } from "../src/schema.ts";

function validExercise(overrides: Partial<Exercise> = {}): unknown {
  return {
    id: "barbell_bench_press",
    sourceIds: ["Barbell_Bench_Press_-_Medium_Grip"],
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

  it("selectable は省略すると true になる", () => {
    const result = exerciseSchema.safeParse(validExercise());
    expect(result.success).toBe(true);
    expect(result.data?.selectable).toBe(true);
  });

  it("selectable: false でもスキーマは受理する（データには残す）", () => {
    // アトラスストーンのような特殊器具種目は候補から外すが、重みは持つ
    const result = exerciseSchema.safeParse(validExercise({ selectable: false }));
    expect(result.success).toBe(true);
    expect(result.data?.selectable).toBe(false);
  });

  it("統合した種目は上流 id を複数持てる", () => {
    // バーベルベンチとダンベルベンチは 1 レコードに畳まれる（ADR 0002）。
    const result = exerciseSchema.safeParse(
      validExercise({ sourceIds: ["Barbell_Bench_Press_-_Medium_Grip", "Dumbbell_Bench_Press"] }),
    );
    expect(result.success).toBe(true);
  });

  it("独自種目は sourceIds が空配列", () => {
    // 上流に存在しない種目。null ではなく空配列で表す。
    expect(exerciseSchema.safeParse(validExercise({ sourceIds: [] })).success).toBe(true);
  });

  it("sourceIds の中の重複を弾く", () => {
    const result = exerciseSchema.safeParse(
      validExercise({ sourceIds: ["Dumbbell_Bench_Press", "Dumbbell_Bench_Press"] }),
    );
    expect(result.success).toBe(false);
    expect(JSON.stringify(result.error?.issues)).toContain("sourceIds");
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

  it("同じ上流 id を 2 つのレコードが持つのを検出する", () => {
    // 統合の取りこぼしで 1 件の上流種目が 2 レコードに出るのを防ぐ。
    const result = datasetSchema.safeParse([
      validExercise(),
      validExercise({ id: "dumbbell_bench_press" }),
    ]);
    expect(result.success).toBe(false);
    expect(JSON.stringify(result.error?.issues)).toContain("Barbell_Bench_Press_-_Medium_Grip");
  });

  it("id が一意なら受理する", () => {
    const result = datasetSchema.safeParse([
      validExercise(),
      validExercise({ id: "dumbbell_bench_press", sourceIds: ["Dumbbell_Bench_Press"] }),
    ]);
    expect(result.success).toBe(true);
  });
});

describe("器具と片手/両手の組み合わせ検証（Q2）", () => {
  // 器具ごとに何が選べるかは test/combinations.test.ts で見る。
  // ここで確認するのは「スキーマがそれを強制するか」だけ。

  it("自重種目に他の器具を混ぜたものを弾く", () => {
    // 腕立て伏せに「バーベル版」はない。器具軸を持てるのは器具を使う種目だけ。
    const result = exerciseSchema.safeParse(
      validExercise({
        equipmentOptions: ["body_only", "dumbbell"],
        defaultEquipment: "body_only",
      }),
    );
    expect(result.success).toBe(false);
    expect(JSON.stringify(result.error?.issues)).toContain("body_only");
  });

  it("自重のみなら受理する", () => {
    const result = exerciseSchema.safeParse(
      validExercise({ equipmentOptions: ["body_only"], defaultEquipment: "body_only" }),
    );
    expect(result.success).toBe(true);
  });

  it("既定の組み合わせが無効なものを弾く", () => {
    // 上半身のバーベル種目に片手の既定値は立たない。
    const result = exerciseSchema.safeParse(
      validExercise({
        lateralityOptions: ["bilateral", "unilateral"],
        defaultLaterality: "unilateral",
      }),
    );
    expect(result.success).toBe(false);
    expect(JSON.stringify(result.error?.issues)).toContain("組み合わせ");
  });

  it("有効な組み合わせが 1 つもないものを弾く", () => {
    const result = exerciseSchema.safeParse(
      validExercise({
        equipmentOptions: ["barbell"],
        defaultEquipment: "barbell",
        lateralityOptions: ["unilateral"],
        defaultLaterality: "unilateral",
      }),
    );
    expect(result.success).toBe(false);
  });

  it("下半身種目ならバーベル × 片脚の既定を受理する", () => {
    const result = exerciseSchema.safeParse(
      validExercise({
        movementPattern: "lunge",
        equipmentOptions: ["barbell"],
        defaultEquipment: "barbell",
        lateralityOptions: ["unilateral"],
        defaultLaterality: "unilateral",
      }),
    );
    expect(result.success).toBe(true);
  });
});
