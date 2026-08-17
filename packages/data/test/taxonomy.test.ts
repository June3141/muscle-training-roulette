import { describe, expect, it } from "vitest";
import { MUSCLES, MUSCLE_GROUPS, MUSCLE_IDS, isMuscleId, musclesInGroup } from "../src/taxonomy.ts";

describe("筋肉タキソノミー（§4.3）", () => {
  it("三角筋が前部・中部・後部に分かれている", () => {
    expect(musclesInGroup("shoulders")).toEqual([
      "deltoid_anterior",
      "deltoid_lateral",
      "deltoid_posterior",
    ]);
  });

  it("大胸筋が上部・中下部に分かれている", () => {
    expect(musclesInGroup("chest")).toHaveLength(2);
  });

  it("分類数は 22（ADR 0005）", () => {
    // ドキュメントに書いた数字とずれると気づけないので、ここで固定する。
    // 変更するときは ADR 0005 と docs/data-survey.md の数字も直すこと。
    expect(MUSCLE_IDS).toHaveLength(22);
    expect(Object.entries(MUSCLE_GROUPS).map(([g]) => musclesInGroup(g as never).length)).toEqual([
      2, // chest
      4, // back
      3, // shoulders
      4, // arms
      6, // legs
      3, // trunk
    ]);
  });

  it("菱形筋を独立分類として持たない（ADR 0005 で僧帽筋中下部に統合）", () => {
    expect(isMuscleId("rhomboids")).toBe(false);
    expect(musclesInGroup("back")).toEqual([
      "latissimus_dorsi",
      "trapezius_upper",
      "trapezius_middle_lower",
      "erector_spinae",
    ]);
  });

  it("首を分類として持たない（ADR 0005 で対象外）", () => {
    // 上流に 5 件あるが secondary 参照が 0 で他種目と繋がらない。
    // マッピング漏れで黙って落ちるのと区別できるよう、意図的に持たないことをテストで固定する。
    expect(isMuscleId("neck")).toBe(false);
    expect(isMuscleId("sternocleidomastoid")).toBe(false);
  });

  it("中臀筋と内転筋は上流が薄くても分類として維持する（ADR 0005）", () => {
    // abductors 5 件 / adductors 6 件しかないが、解剖学的にはスクワット・ランジで確実に働く。
    // 上流が記録していないだけなので、M1 で自前で振る。
    expect(isMuscleId("gluteus_medius")).toBe(true);
    expect(isMuscleId("adductors")).toBe(true);
  });

  it("部位総称を筋肉 ID として持たない", () => {
    // 「Core」のような総称は筋肉名として使わない（§4.3）
    for (const generic of ["core", "chest", "back", "shoulders", "arms", "legs", "delts"]) {
      expect(isMuscleId(generic)).toBe(false);
    }
  });

  it("すべての筋肉が既知のグループに属する", () => {
    for (const id of MUSCLE_IDS) {
      expect(Object.hasOwn(MUSCLE_GROUPS, MUSCLES[id].group)).toBe(true);
    }
  });

  it("すべてのグループに少なくとも 1 つの筋肉がある", () => {
    for (const group of Object.keys(MUSCLE_GROUPS)) {
      expect(musclesInGroup(group as keyof typeof MUSCLE_GROUPS).length).toBeGreaterThan(0);
    }
  });

  it("日本語名が重複していない", () => {
    const names = MUSCLE_IDS.map((id) => MUSCLES[id].ja);
    expect(new Set(names).size).toBe(names.length);
  });

  it("プロトタイプ汚染された文字列を筋肉 ID と誤認しない", () => {
    expect(isMuscleId("toString")).toBe(false);
    expect(isMuscleId("constructor")).toBe(false);
  });
});
