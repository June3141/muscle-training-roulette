/**
 * 種目を分類する軸の値。zod に依存しない素の定数として持つ。
 *
 * スキーマ（`schema.ts`）と組み合わせ規則（`combinations.ts`）の両方から参照するため、
 * ここに切り出している。スキーマ側に置くと `schema → combinations → schema` の循環になる。
 */

/**
 * 器具。free-exercise-db の値を正規化し、`smith` を独自に足している。
 * 器具は重みに影響しない独立軸として扱う（ADR 0002）。
 */
export const EQUIPMENT = [
  "barbell",
  "dumbbell",
  "kettlebell",
  "ez_curl_bar",
  "smith",
  /** 片端をランドマイン（コーナー）に固定したバー。T バーロウ、ジャマーもこれ。 */
  "landmine",
  "machine",
  "cable",
  "bands",
  "body_only",
  "exercise_ball",
  "medicine_ball",
  "foam_roll",
  "other",
] as const;

/**
 * 動作パターン。多様性制約（§5.2）で重複を減点するために使う。
 *
 * ここが粗いと「胸 5 種目が全部水平プレス」を検出できない。
 *
 * §4.2 の暫定リストに `wrist_flexion` / `jump` / `throw` を足した。
 * 全 616 レコードに振ってみると、この 3 つが無いと 72 レコードが `other` に落ちる。
 */
export const MOVEMENT_PATTERNS = [
  "horizontal_press",
  "incline_press",
  "vertical_press",
  "horizontal_pull",
  "vertical_pull",
  /** フライ・ペックデック等の水平内転。プレスと区別しないと §7「胸のみ」ケースを判定できない。 */
  "horizontal_adduction",
  "shoulder_raise",
  "elbow_flexion",
  "elbow_extension",
  "squat",
  "hinge",
  "lunge",
  "leg_isolation",
  "calf_raise",
  "trunk_flexion",
  "trunk_rotation",
  "trunk_antiextension",
  /** 手首の屈伸と握力。リストカールは肘を曲げないので elbow_flexion と分ける（26 レコード）。 */
  "wrist_flexion",
  "carry",
  /** 跳躍・走。プライオメトリクスとスプリントドリル（36 レコード）。 */
  "jump",
  /** 投擲。メディシンボール系（10 レコード）。跳躍と同じ枠にすると多様性制約が誤作動する。 */
  "throw",
  "other",
] as const;

export const LATERALITY = ["bilateral", "unilateral"] as const;
export const FORCE = ["push", "pull", "static"] as const;
export const MECHANIC = ["compound", "isolation"] as const;
export const LEVEL = ["beginner", "intermediate", "expert"] as const;
export const CATEGORY = [
  "strength",
  "powerlifting",
  "olympic_weightlifting",
  "strongman",
  "plyometrics",
  "stretching",
  "cardio",
] as const;

export type Equipment = (typeof EQUIPMENT)[number];
export type MovementPattern = (typeof MOVEMENT_PATTERNS)[number];
export type Laterality = (typeof LATERALITY)[number];
