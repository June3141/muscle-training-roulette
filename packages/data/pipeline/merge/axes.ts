/**
 * 上流レコードから器具軸・片手両手軸の値を決める。
 *
 * 上流の `equipment` は表記が揺れているうえ、**名前と食い違うことがある**
 * （Smith Machine Bench Press の equipment は machine）。名前が具体的な器具を
 * 名指ししている場合はそちらを優先する。
 */
import type { Equipment, Laterality } from "../../src/axes.ts";
import type { UpstreamExercise } from "../upstream.ts";

/** 上流の equipment 表記 → こちらの器具 id。 */
const UPSTREAM_EQUIPMENT: Readonly<Record<string, Equipment>> = {
  barbell: "barbell",
  dumbbell: "dumbbell",
  kettlebells: "kettlebell",
  "e-z curl bar": "ez_curl_bar",
  machine: "machine",
  cable: "cable",
  bands: "bands",
  "body only": "body_only",
  "exercise ball": "exercise_ball",
  "medicine ball": "medicine_ball",
  "foam roll": "foam_roll",
  other: "other",
};

/** スミスマシン。上流は machine としか書いていない。 */
const IS_SMITH = /\bsmith\b/i;

/**
 * 片端を固定したバー。ランドマイン、T バーロウ、ジャマー。
 *
 * 上流は barbell と書いているが、**梃子なので片手で扱える。**
 * フリーウェイトのバーベルと同じ扱いにすると、One-Arm Long Bar Row が
 * 「無効な組み合わせ」になってしまう。
 */
const IS_LANDMINE = /\blandmine\b|\blong bar\b|\bjammer\b|\bt-?bar row\b/i;

export function resolveEquipment(exercise: UpstreamExercise): Equipment {
  const fromUpstream = UPSTREAM_EQUIPMENT[exercise.equipment ?? "other"] ?? "other";
  if (IS_SMITH.test(exercise.name)) return "smith";
  if (fromUpstream === "barbell" && IS_LANDMINE.test(exercise.name)) return "landmine";
  return fromUpstream;
}

/**
 * 片手/両手。上流はフィールドを持たないので名前から読む。
 *
 * 名前が何も言っていなければ両手。**片手であることは名前に書かれる**のが上流の慣習で、
 * 書かれていないものを片手と推定する材料はない。
 */
const IS_UNILATERAL =
  /\b(one|single|1)[- ]?(arm|armed|leg|legged|hand|handed|sided?)\b|\balternat(e|ing)\b/i;

export function resolveLaterality(exercise: UpstreamExercise): Laterality {
  return IS_UNILATERAL.test(exercise.name) ? "unilateral" : "bilateral";
}
