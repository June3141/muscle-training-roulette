/**
 * 種目の順序付け（design.md §5.3、Issue #14）。
 *
 * §5.3 は 3 つのルールを挙げているが、キーは 2 つしかない。
 * **「先に小筋群を潰さない」は独立した機構ではなく、
 * 大筋群優先が compound 優先に勝つという優先順位そのもの**（ADR 0009）。
 * ここではその優先順位が守られているかを見る。
 */
import { describe, expect, it } from "vitest";
import { orderExercises, primaryMuscleOf } from "../src/order.ts";
import { exercise } from "./fixtures.ts";

describe("primaryMuscleOf", () => {
  it("重みが最大の筋を返す", () => {
    const bench = exercise({
      muscleWeights: {
        pectoralis_major_sternal: 0.6,
        triceps_brachii: 0.25,
        deltoid_anterior: 0.15,
      },
    });
    expect(primaryMuscleOf(bench)).toBe("pectoralis_major_sternal");
  });

  it("同点ならタキソノミーの並び順で先に来る筋を返す", () => {
    const even = exercise({ muscleWeights: { quadriceps: 0.5, hamstrings: 0.5 } });
    expect(primaryMuscleOf(even)).toBe("quadriceps");
  });
});

describe("orderExercises: ルール 2（大筋群 → 小筋群）", () => {
  it("大筋群の種目が小筋群の種目より前に来る", () => {
    const curl = exercise({ id: "curl", muscleWeights: { biceps_brachii: 1 } });
    const row = exercise({ id: "row", muscleWeights: { latissimus_dorsi: 1 } });
    expect(
      orderExercises([curl, row], ["latissimus_dorsi", "biceps_brachii"]).map((e) => e.id),
    ).toEqual(["row", "curl"]);
  });

  it("中間の大きさの筋は大筋群の後、小筋群の前に来る", () => {
    const abs = exercise({ id: "abs", muscleWeights: { rectus_abdominis: 1 } });
    const press = exercise({ id: "press", muscleWeights: { deltoid_anterior: 1 } });
    const squat = exercise({ id: "squat", muscleWeights: { quadriceps: 1 } });
    expect(orderExercises([abs, press, squat], []).map((e) => e.id)).toEqual([
      "squat",
      "press",
      "abs",
    ]);
  });
});

describe("orderExercises: ルール 1（compound → isolation）", () => {
  it("同じ大きさの筋なら複合種目が単関節種目より前に来る", () => {
    const fly = exercise({
      id: "fly",
      muscleWeights: { pectoralis_major_sternal: 1 },
      mechanic: "isolation",
    });
    const bench = exercise({
      id: "bench",
      muscleWeights: { pectoralis_major_sternal: 1 },
      mechanic: "compound",
    });
    expect(orderExercises([fly, bench], ["pectoralis_major_sternal"]).map((e) => e.id)).toEqual([
      "bench",
      "fly",
    ]);
  });

  it("mechanic が未設定の種目は複合種目より後に来る", () => {
    const unknown = exercise({
      id: "unknown",
      muscleWeights: { pectoralis_major_sternal: 1 },
      mechanic: null,
    });
    const bench = exercise({
      id: "bench",
      muscleWeights: { pectoralis_major_sternal: 1 },
      mechanic: "compound",
    });
    expect(orderExercises([unknown, bench], []).map((e) => e.id)).toEqual(["bench", "unknown"]);
  });
});

describe("orderExercises: ルール衝突", () => {
  /**
   * §5.3 の「先に小筋群を潰さない」がこの向きを決める。
   * 三頭の複合種目を先に置くと、後から来る胸の種目で三頭が支えられなくなる。
   */
  it("大筋群の単関節種目が、小筋群の複合種目より前に来る", () => {
    const jmPress = exercise({
      id: "jmPress",
      muscleWeights: { triceps_brachii: 0.8, pectoralis_major_sternal: 0.2 },
      mechanic: "compound",
    });
    const fly = exercise({
      id: "fly",
      muscleWeights: { pectoralis_major_sternal: 0.9, triceps_brachii: 0.1 },
      mechanic: "isolation",
    });
    expect(orderExercises([jmPress, fly], ["pectoralis_major_sternal"]).map((e) => e.id)).toEqual([
      "fly",
      "jmPress",
    ]);
  });
});

describe("orderExercises: 同点の解消", () => {
  it("大きさと mechanic が同じなら、対象部位への寄与が大きい方が前に来る", () => {
    const thin = exercise({
      id: "thin",
      muscleWeights: { pectoralis_major_sternal: 0.5, triceps_brachii: 0.5 },
    });
    const thick = exercise({ id: "thick", muscleWeights: { pectoralis_major_sternal: 1 } });
    expect(orderExercises([thin, thick], ["pectoralis_major_sternal"]).map((e) => e.id)).toEqual([
      "thick",
      "thin",
    ]);
  });

  it("すべて同点なら id 昇順で決まる", () => {
    const b = exercise({ id: "b", muscleWeights: { quadriceps: 1 } });
    const a = exercise({ id: "a", muscleWeights: { quadriceps: 1 } });
    expect(orderExercises([b, a], ["quadriceps"]).map((e) => e.id)).toEqual(["a", "b"]);
  });

  it("入力を破壊しない", () => {
    const b = exercise({ id: "b", muscleWeights: { quadriceps: 1 } });
    const a = exercise({ id: "a", muscleWeights: { quadriceps: 1 } });
    const input = [b, a];
    orderExercises(input, ["quadriceps"]);
    expect(input.map((e) => e.id)).toEqual(["b", "a"]);
  });

  it("空の集合でも落ちない", () => {
    expect(orderExercises([], ["quadriceps"])).toEqual([]);
  });
});
