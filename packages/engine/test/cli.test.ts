/**
 * CLI（Issue #15、design.md §10 の M3 完了条件）。
 *
 * **フロントエンドを書かずに出力を目視するための道具。**
 * 引数の解釈と、渡された部位・器具をそのまま選択エンジンへ流せているかだけを見る。
 * 選択の中身は select.test.ts と golden/。
 */
import { describe, expect, it } from "vitest";
import { parseRequest, runCli } from "../src/cli.ts";
import { exercise } from "./fixtures.ts";

const dataset = [
  exercise({ id: "bench", muscleWeights: { pectoralis_major_sternal: 1 } }),
  exercise({
    id: "pushdown",
    muscleWeights: { triceps_brachii: 1 },
    equipmentOptions: ["cable"],
    mechanic: "isolation",
  }),
  exercise({ id: "squat", muscleWeights: { quadriceps: 1 }, movementPattern: "squat" }),
];

describe("parseRequest: 部位の解釈", () => {
  it("筋肉 ID をそのまま受ける", () => {
    expect(parseRequest(["--targets", "quadriceps,hamstrings"]).targets).toEqual([
      "quadriceps",
      "hamstrings",
    ]);
  });

  it("部位グループ名は所属する筋肉に展開する", () => {
    expect(parseRequest(["--targets", "chest"]).targets).toEqual([
      "pectoralis_major_clavicular",
      "pectoralis_major_sternal",
    ]);
  });

  it("グループと筋肉 ID が重なっても重複しない", () => {
    expect(parseRequest(["--targets", "chest,pectoralis_major_sternal"]).targets).toHaveLength(2);
  });

  it("知らない部位名はエラーにする", () => {
    expect(() => parseRequest(["--targets", "triceps"])).toThrow(/triceps/);
  });

  it("部位を指定しなければエラーにする", () => {
    expect(() => parseRequest([])).toThrow(/--targets/);
  });
});

describe("parseRequest: 種目数と器具", () => {
  it("種目数の既定値がある", () => {
    expect(parseRequest(["--targets", "chest"]).count).toBeGreaterThan(0);
  });

  it("種目数を指定できる", () => {
    expect(parseRequest(["--targets", "chest", "--count", "3"]).count).toBe(3);
  });

  it("§3 の範囲外の種目数はエラーにする", () => {
    expect(() => parseRequest(["--targets", "chest", "--count", "11"])).toThrow(/1/);
    expect(() => parseRequest(["--targets", "chest", "--count", "0"])).toThrow(/1/);
  });

  it("数値でない種目数はエラーにする", () => {
    expect(() => parseRequest(["--targets", "chest", "--count", "six"])).toThrow();
  });

  it("器具を指定できる", () => {
    expect(
      parseRequest(["--targets", "chest", "--equipment", "barbell,dumbbell"]).allowedEquipment,
    ).toEqual(["barbell", "dumbbell"]);
  });

  it("器具を省略したら制限しない", () => {
    expect(parseRequest(["--targets", "chest"]).allowedEquipment).toBeUndefined();
  });

  it("知らない器具名はエラーにする", () => {
    expect(() => parseRequest(["--targets", "chest", "--equipment", "kettleball"])).toThrow(
      /kettleball/,
    );
  });

  it("知らないオプションはエラーにする", () => {
    expect(() => parseRequest(["--targets", "chest", "--sets", "3"])).toThrow();
  });
});

describe("runCli", () => {
  it("要求した部位と種目数を先頭に出す", () => {
    const output = runCli(["--targets", "quadriceps", "--count", "1"], dataset);
    expect(output.split("\n")[0]).toContain("大腿四頭筋");
    expect(output.split("\n")[0]).toContain("1 種目");
  });

  it("種目・カバレッジ・カバーできない部位をすべて出す", () => {
    const output = runCli(["--targets", "quadriceps,biceps_brachii", "--count", "1"], dataset);
    expect(output).toContain("カバレッジ");
    expect(output).toContain("カバーできない部位: 上腕二頭筋");
  });

  it("器具フィルタが選択に効く", () => {
    const output = runCli(
      ["--targets", "triceps_brachii", "--count", "1", "--equipment", "barbell"],
      dataset,
    );
    expect(output).toContain("カバーできない部位: 上腕三頭筋");
  });
});
