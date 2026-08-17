/**
 * 種目名からは判別できず、動作を確認して人間が決めた腹筋の写像。
 *
 * キーは上流の id。**なぜその分類なのかを必ず書く。**
 * 名前パターンで拾えるものはルール側に足すこと。ここは例外だけを置く。
 */
import type { MuscleId } from "../../src/taxonomy.ts";

export interface AbdominalOverride {
  readonly muscles: readonly MuscleId[];
  readonly reason: string;
}

export const ABDOMINAL_OVERRIDES: Record<string, AbdominalOverride> = {
  // --- 回旋・側屈が主 ---
  Bent_Press: {
    muscles: ["obliques"],
    reason: "ケトルベルを頭上に保持したまま体を横に倒す。側屈で支える",
  },
  Elbow_to_Knee: {
    muscles: ["obliques"],
    reason: "肘と対角の膝を合わせる。回旋を伴う屈曲",
  },
  Kettlebell_Figure_8: {
    muscles: ["obliques"],
    reason: "脚の間で 8 の字に回す。回旋の連続",
  },
  Kettlebell_Pass_Between_The_Legs: {
    muscles: ["obliques"],
    reason: "脚の間で左右に受け渡す。回旋の反復",
  },
  Landmine_180s: {
    muscles: ["obliques"],
    reason: "バーベルの端を持って 180 度振る。回旋そのもの",
  },
  "One-Arm_Medicine_Ball_Slam": {
    muscles: ["obliques"],
    reason: "片手で振り下ろす。左右非対称なので回旋抵抗が主",
  },
  Sledgehammer_Swings: {
    muscles: ["obliques"],
    reason: "ハンマーを斜めに振り下ろす。回旋",
  },
  Spell_Caster: {
    muscles: ["obliques"],
    reason: "ダンベルを腰の高さで左右に振る。回旋",
  },
  Standing_Cable_Lift: {
    muscles: ["obliques"],
    reason: "低い位置から斜め上へ引き上げる。回旋を伴う",
  },

  // --- 体幹屈曲が主 ---
  "Exercise_Ball_Pull-In": {
    muscles: ["rectus_abdominis"],
    reason: "プランク姿勢からボールを引き寄せる。股関節屈曲と体幹屈曲",
  },
  Hanging_Pike: {
    muscles: ["rectus_abdominis"],
    reason: "ぶら下がって脚を体幹に近づける。体幹屈曲",
  },
  "Otis-Up": {
    muscles: ["rectus_abdominis"],
    reason: "重量を持って行うシットアップ",
  },
  Seated_Leg_Tucks: {
    muscles: ["rectus_abdominis"],
    reason: "座位で膝を胸に引き寄せる。体幹屈曲",
  },
  "Supine_One-Arm_Overhead_Throw": {
    muscles: ["rectus_abdominis"],
    reason: "仰向けから起き上がりながら投げる。体幹屈曲",
  },
  "Supine_Two-Arm_Overhead_Throw": {
    muscles: ["rectus_abdominis"],
    reason: "同上。両手なので回旋は入らない",
  },

  // --- 姿勢保持が主 ---
  Spider_Crawl: {
    muscles: ["transversus_abdominis"],
    reason: "プランク姿勢を保ったまま前進する。アンチ伸展",
  },
  Suspended_Fallout: {
    muscles: ["transversus_abdominis"],
    reason: "サスペンションで腕を前方に伸ばす。ロールアウトと同じアンチ伸展",
  },
  Wind_Sprints: {
    muscles: ["transversus_abdominis"],
    reason: "全力疾走。体幹を固めて力を伝える働きが主",
  },
};
