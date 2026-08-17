/**
 * 種目名からは判別できず、`instructions` を読んで人間が決めた三角筋の写像。
 *
 * キーは上流の id。**判断の根拠（instructions の該当箇所）を必ず書く。**
 * 名前パターンで拾えるものはルール側に足すこと。ここは例外だけを置く。
 */
import type { MuscleId } from "../../src/taxonomy.ts";

export interface ShoulderOverride {
  readonly muscles: readonly MuscleId[];
  /** instructions のどの記述から判断したか */
  readonly reason: string;
}

export const SHOULDER_OVERRIDES: Record<string, ShoulderOverride> = {
  Alternating_Deltoid_Raise: {
    muscles: ["deltoid_anterior"],
    reason: "「raise the weights directly in front of you」= 体の前方に上げるのでフロントレイズ",
  },
  Dumbbell_Raise: {
    muscles: ["deltoid_lateral"],
    reason:
      "「Use your side shoulders」「dumbbells should be to the side of the body」= サイドレイズ",
  },
  Single_Dumbbell_Raise: {
    muscles: ["deltoid_anterior"],
    reason: "両手で 1 つのダンベルの頭を持ち、腕を伸ばしたまま前方に上げる",
  },
  "Standing_Low-Pulley_Deltoid_Raise": {
    muscles: ["deltoid_lateral"],
    reason: "「come across the body」= 体を横切るクロスボディのラテラルレイズ",
  },
  Straight_Raises_on_Incline_Bench: {
    muscles: ["deltoid_posterior"],
    reason: "インクラインベンチにうつ伏せ、腕を垂らした位置から上げる = リアデルト",
  },
  Power_Partials: {
    muscles: ["deltoid_lateral"],
    reason: "腕を体側に置き palms facing torso から上げる、サイドレイズの部分反復",
  },
  Car_Drivers: {
    muscles: ["deltoid_anterior"],
    reason: "プレートを前方に伸ばして保持したままハンドルのように回す。前方保持なので前部",
  },
  Low_Pulley_Row_To_Neck: {
    muscles: ["deltoid_posterior"],
    reason: "ロープを首元へ引く。フェイスプルと同じ水平外転",
  },
  Kettlebell_Pirate_Ships: {
    muscles: ["deltoid_lateral"],
    reason: "ケトルベルを頭上で左右に振る。外転位での保持が主",
  },
  Battling_Ropes: {
    muscles: ["deltoid_anterior", "deltoid_lateral"],
    reason: "ロープを振り続ける全身種目。肩は屈曲と外転の反復",
  },
  Backward_Medicine_Ball_Throw: {
    muscles: ["deltoid_anterior", "deltoid_lateral"],
    reason: "頭上を通して後方へ投げる。肩屈曲から伸展までの全可動域",
  },
  Medicine_Ball_Scoop_Throw: {
    muscles: ["deltoid_anterior"],
    reason: "下からすくい上げて前方へ投げる。肩屈曲",
  },
  Return_Push_from_Stance: {
    muscles: ["deltoid_anterior"],
    reason: "前方へ押し返す動作。肩屈曲",
  },
  // --- 上流の force が null / static で動作方向から推定できないもの ---
  "Push-Up_Wide": {
    muscles: ["deltoid_anterior"],
    reason: "ワイドプッシュアップ。押す動作なので前部（上流の force が欠損している）",
  },
  Isometric_Chest_Squeezes: {
    muscles: ["deltoid_anterior"],
    reason: "手を合わせて押し合う等尺性。肩は水平内転位で保持するので前部",
  },
  Side_Bridge: {
    muscles: ["deltoid_lateral"],
    reason: "サイドプランク。下側の肩が体重を外転位で支える",
  },
  Conans_Wheel: {
    muscles: ["deltoid_anterior", "deltoid_lateral"],
    reason: "重量物を抱えて回る。肩は屈曲と外転で保持し続ける",
  },

  Kneeling_Arm_Drill: {
    muscles: ["deltoid_anterior", "deltoid_posterior"],
    reason: "走行時の腕振りの反復。前後に振るので前部と後部の両方",
  },
};
