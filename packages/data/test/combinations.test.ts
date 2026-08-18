import { describe, expect, it } from "vitest";
import type { AxisInput } from "../src/combinations.ts";
import { isValidCombination, validCombinations } from "../src/combinations.ts";

const benchPress: AxisInput = {
  movementPattern: "horizontal_press",
  equipmentOptions: ["barbell", "dumbbell", "smith", "machine", "cable"],
  lateralityOptions: ["bilateral", "unilateral"],
};

const splitSquat: AxisInput = {
  movementPattern: "lunge",
  equipmentOptions: ["barbell", "dumbbell", "smith"],
  lateralityOptions: ["bilateral", "unilateral"],
};

describe("器具と片手/両手の有効な組み合わせ（§2 Q2）", () => {
  it("両手はどの器具でも選べる", () => {
    for (const equipment of benchPress.equipmentOptions) {
      expect(isValidCombination(benchPress, equipment, "bilateral"), equipment).toBe(true);
    }
  });

  it("上半身種目でバーベルは片手を選べない", () => {
    // 1 本のバーを両手で持つ器具は、左右を独立に動かせない。
    expect(isValidCombination(benchPress, "barbell", "unilateral")).toBe(false);
  });

  it("上半身種目でスミスマシンは片手を選べない", () => {
    expect(isValidCombination(benchPress, "smith", "unilateral")).toBe(false);
  });

  it("下半身種目ならバーやスミスでも片脚を選べる", () => {
    // 片脚スクワットはバーを背中に担いだままできる。上流の
    // Smith Single-Leg Split Squat / One Leg Barbell Squat がこの形。
    expect(isValidCombination(splitSquat, "barbell", "unilateral")).toBe(true);
    expect(isValidCombination(splitSquat, "smith", "unilateral")).toBe(true);
  });

  it("ケーブルは上半身でも片手・両手の両方を選べる", () => {
    expect(isValidCombination(benchPress, "cable", "bilateral")).toBe(true);
    expect(isValidCombination(benchPress, "cable", "unilateral")).toBe(true);
  });

  it("ダンベルは左右が独立しているので上半身でも片手を選べる", () => {
    expect(isValidCombination(benchPress, "dumbbell", "unilateral")).toBe(true);
  });

  it("マシンは片手を選べる（左右独立のイソラテラル機が一般的）", () => {
    expect(isValidCombination(benchPress, "machine", "unilateral")).toBe(true);
  });

  it("equipmentOptions にない器具は無効", () => {
    expect(isValidCombination(benchPress, "kettlebell", "bilateral")).toBe(false);
  });

  it("lateralityOptions にない持ち方は無効", () => {
    const bilateralOnly: AxisInput = { ...benchPress, lateralityOptions: ["bilateral"] };
    expect(isValidCombination(bilateralOnly, "dumbbell", "unilateral")).toBe(false);
  });
});

describe("validCombinations", () => {
  it("無効な組み合わせを落とした直積を返す", () => {
    expect(validCombinations(benchPress)).toEqual([
      { equipment: "barbell", laterality: "bilateral" },
      { equipment: "dumbbell", laterality: "bilateral" },
      { equipment: "dumbbell", laterality: "unilateral" },
      { equipment: "smith", laterality: "bilateral" },
      { equipment: "machine", laterality: "bilateral" },
      { equipment: "machine", laterality: "unilateral" },
      { equipment: "cable", laterality: "bilateral" },
      { equipment: "cable", laterality: "unilateral" },
    ]);
  });

  it("下半身種目では直積がそのまま残る", () => {
    expect(validCombinations(splitSquat)).toHaveLength(6);
  });

  it("有効な組み合わせが必ず 1 つ以上ある", () => {
    // 両手はどの器具でも選べるので、空になることはない。
    const barbellOnly: AxisInput = {
      movementPattern: "horizontal_press",
      equipmentOptions: ["barbell"],
      lateralityOptions: ["bilateral"],
    };
    expect(validCombinations(barbellOnly)).toEqual([
      { equipment: "barbell", laterality: "bilateral" },
    ]);
  });
});
