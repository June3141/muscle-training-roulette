import { describe, expect, it } from "vitest";
import { LOAD_UNIT } from "../src/load.ts";

describe("重量の保持単位（ADR 0001）", () => {
  it("器具 1 個あたりの重量を持つ", () => {
    // ダンベル片手 20kg は 20。バーベル 20kg も 20。
    // 「片側」ではなく「器具 1 個あたり」と言い換えると、両手/片手で例外がなくなる。
    // ここを後から変えると全データの意味が変わるので、値をテストで固定する。
    expect(LOAD_UNIT).toBe("per_implement");
  });
});
