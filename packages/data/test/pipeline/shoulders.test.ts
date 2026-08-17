import { describe, expect, it } from "vitest";
import { SHOULDER_OVERRIDES } from "../../pipeline/mapping/shoulder-overrides.ts";
import {
  type ShoulderMappingInput,
  isUnmappable,
  mapShoulders,
} from "../../pipeline/mapping/shoulders.ts";
import { isTargetCategory, loadUpstream } from "../../pipeline/upstream.ts";

function input(name: string, extra: Partial<ShoulderMappingInput> = {}): ShoulderMappingInput {
  return { id: "Test_Exercise", name, force: null, primaryMuscles: ["shoulders"], ...extra };
}

function musclesOf(name: string, extra: Partial<ShoulderMappingInput> = {}): readonly string[] {
  const result = mapShoulders(input(name, extra));
  if (result === null || isUnmappable(result)) return [];
  return result.muscles;
}

describe("名前からの判定", () => {
  it("サイドレイズは中部", () => {
    expect(musclesOf("Side Lateral Raise")).toEqual(["deltoid_lateral"]);
  });

  it("フロントレイズは前部", () => {
    expect(musclesOf("Front Dumbbell Raise")).toEqual(["deltoid_anterior"]);
  });

  it("リアデルトは後部", () => {
    expect(musclesOf("Rear Delt Fly")).toEqual(["deltoid_posterior"]);
  });

  it("ショルダープレスは前部と中部", () => {
    expect(musclesOf("Barbell Shoulder Press")).toEqual(["deltoid_anterior", "deltoid_lateral"]);
  });

  it("アップライトロウは中部", () => {
    expect(musclesOf("Upright Barbell Row")).toEqual(["deltoid_lateral"]);
  });
});

describe("ルールの適用順", () => {
  it("ベントオーバーラテラルレイズは中部ではなく後部", () => {
    // 「lateral raise」にも当たるが、後部のパターンを先に置いているので後部になる
    expect(musclesOf("Bent Over Lateral Raise")).toEqual(["deltoid_posterior"]);
  });

  it("手動判定はパターンより優先される", () => {
    // Dumbbell Raise は「raise」を含むが、instructions で中部と判定済み
    const result = mapShoulders(input("Dumbbell Raise", { id: "Dumbbell_Raise" }));
    expect(isUnmappable(result)).toBe(false);
    expect(result === null ? [] : "muscles" in result ? result.muscles : []).toEqual([
      "deltoid_lateral",
    ]);
  });
});

describe("補助としての三角筋（force からの推定）", () => {
  it("押す動作の補助は前部", () => {
    const muscles = musclesOf("Barbell Bench Press - Wide Grip", {
      force: "push",
      primaryMuscles: ["chest"],
    });
    // ベンチプレスは「press」パターンに当たるので前部+中部になる
    expect(muscles).toContain("deltoid_anterior");
  });

  it("引く動作の補助は後部", () => {
    expect(
      musclesOf("Bent Over Barbell Row", { force: "pull", primaryMuscles: ["middle back"] }),
    ).toEqual(["deltoid_posterior"]);
  });

  it("肩が主働筋なのに名前で判別できないものは force に頼らない", () => {
    // 補助ではないので、動作方向から機械的に決めず個別判断に回す
    expect(mapShoulders(input("Mystery Shoulder Move", { force: "push" }))).toBeNull();
  });
});

describe("判別不能として明示するもの", () => {
  it("ローテーターカフ種目は三角筋に寄せない", () => {
    const result = mapShoulders(input("External Rotation with Band"));
    expect(isUnmappable(result)).toBe(true);
  });

  it("全身種目は特定の部位に寄せない", () => {
    const result = mapShoulders(input("Kettlebell Turkish Get-Up (Squat style)"));
    expect(isUnmappable(result)).toBe(true);
  });
});

describe("上流データ全件の写像", () => {
  it("判定できない種目が残っていない", async () => {
    const all = (await loadUpstream()).filter(isTargetCategory);
    const withShoulders = all.filter(
      (ex) => ex.primaryMuscles.includes("shoulders") || ex.secondaryMuscles.includes("shoulders"),
    );

    const unresolved = withShoulders.filter((ex) => mapShoulders(ex) === null);
    // 上流に新しい種目が入ったらここが落ちる。落ちたら写像ルールか手動判定を足す。
    expect(unresolved.map((ex) => `${ex.id} (${ex.name})`)).toEqual([]);
  });

  it("手動判定の id がすべて上流に存在する", async () => {
    const ids = new Set((await loadUpstream()).map((ex) => ex.id));
    const stale = Object.keys(SHOULDER_OVERRIDES).filter((id) => !ids.has(id));
    expect(stale).toEqual([]);
  });

  it("手動判定に理由が書かれている", () => {
    for (const [id, override] of Object.entries(SHOULDER_OVERRIDES)) {
      expect(override.reason.length, id).toBeGreaterThan(10);
      expect(override.muscles.length, id).toBeGreaterThan(0);
    }
  });
});
