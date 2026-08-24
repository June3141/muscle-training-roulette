/**
 * 動作パターンと筋重みの整合（#72）。
 *
 * `movement.ts` は種目名の正規表現しか見ないので、名前が動作を表していないレコードを取り違える。
 * **重み側は上流の primaryMuscles から来るので、両者は独立に決まる。**
 * 片方が誤っていれば「この動作なら必ず使う筋」が重みに現れないという形で出る。
 */
import { describe, expect, it } from "vitest";
import { buildDataset } from "../../pipeline/dataset/build.ts";
import type { MovementPattern } from "../../src/axes.ts";
import type { MuscleId } from "../../src/taxonomy.ts";
import { isTargetCategory, loadUpstream } from "../../pipeline/upstream.ts";

const dataset = buildDataset((await loadUpstream()).filter(isTargetCategory));

/**
 * その動作なら少なくとも 1 つは主働筋か補助筋に現れるはずの筋。
 *
 * **絞りすぎると誤検出になるので、動作の定義から外せない筋だけを並べる。**
 * 空配列は「動作から筋を特定できない」もの。運搬・跳躍・投擲は全身を使い、
 * `other` はそもそも分類できなかった残りなので、ここでは検査しない。
 */
const PRIME_MOVERS: Readonly<Record<MovementPattern, readonly MuscleId[]>> = {
  horizontal_press: [
    "pectoralis_major_sternal",
    "pectoralis_major_clavicular",
    "deltoid_anterior",
    "triceps_brachii",
  ],
  incline_press: [
    "pectoralis_major_sternal",
    "pectoralis_major_clavicular",
    "deltoid_anterior",
    "triceps_brachii",
  ],
  vertical_press: ["deltoid_anterior", "deltoid_lateral", "triceps_brachii", "trapezius_upper"],
  horizontal_pull: [
    "latissimus_dorsi",
    "trapezius_middle_lower",
    "trapezius_upper",
    "deltoid_posterior",
    "erector_spinae",
    "biceps_brachii",
  ],
  vertical_pull: [
    "latissimus_dorsi",
    "trapezius_middle_lower",
    "deltoid_posterior",
    "biceps_brachii",
  ],
  shoulder_extension: [
    "latissimus_dorsi",
    "pectoralis_major_sternal",
    "pectoralis_major_clavicular",
    "triceps_brachii",
  ],
  horizontal_adduction: [
    "pectoralis_major_sternal",
    "pectoralis_major_clavicular",
    "deltoid_anterior",
    "deltoid_posterior",
    "trapezius_middle_lower",
  ],
  shoulder_raise: [
    "deltoid_anterior",
    "deltoid_lateral",
    "deltoid_posterior",
    "trapezius_upper",
    "trapezius_middle_lower",
  ],
  elbow_flexion: ["biceps_brachii", "brachioradialis", "wrist_flexors"],
  elbow_extension: ["triceps_brachii"],
  squat: ["quadriceps", "gluteus_maximus", "hamstrings", "adductors"],
  lunge: ["quadriceps", "gluteus_maximus", "gluteus_medius", "hamstrings", "adductors"],
  hinge: ["hamstrings", "gluteus_maximus", "erector_spinae", "quadriceps", "trapezius_upper"],
  leg_isolation: [
    "quadriceps",
    "hamstrings",
    "gluteus_maximus",
    "gluteus_medius",
    "adductors",
    "triceps_surae",
  ],
  calf_raise: ["triceps_surae"],
  trunk_flexion: ["rectus_abdominis", "obliques", "transversus_abdominis"],
  trunk_rotation: ["obliques", "rectus_abdominis", "transversus_abdominis", "erector_spinae"],
  trunk_antiextension: ["rectus_abdominis", "obliques", "transversus_abdominis", "erector_spinae"],
  wrist_flexion: ["wrist_flexors", "brachioradialis"],
  carry: [],
  jump: [],
  throw: [],
  other: [],
};

/**
 * 矛盾したままでよいレコード。
 *
 * **消すと矛盾が黙って通るので、理由なしに足さない。**
 */
const ALLOWED: Readonly<Record<string, string>> = {
  bottom_up_clean_from_the_hang_position:
    "ボトムズアップクリーンは動作としてはハングクリーンで hinge が正しい。上流が握力を主働筋に置いているだけ。",
};

describe("動作パターンと筋重みの整合（#72）", () => {
  it("その動作なら使うはずの筋が重みに現れる", () => {
    const contradictions = dataset.exercises
      .filter((exercise) => {
        const movers = PRIME_MOVERS[exercise.movementPattern];
        if (movers.length === 0) return false;
        return !movers.some((muscle) => exercise.muscleWeights[muscle] !== undefined);
      })
      .filter((exercise) => ALLOWED[exercise.id] === undefined)
      .map((exercise) => `${exercise.id} (${exercise.movementPattern})`);

    expect(contradictions).toEqual([]);
  });

  it("例外に挙げたレコードは実在して、実際に矛盾している", () => {
    for (const [id, reason] of Object.entries(ALLOWED)) {
      const exercise = dataset.exercises.find((candidate) => candidate.id === id);
      expect(exercise, id).toBeDefined();
      const movers = PRIME_MOVERS[exercise?.movementPattern ?? "other"];
      expect(
        movers.some((muscle) => exercise?.muscleWeights[muscle] !== undefined),
        `${id} はもう矛盾していない: ${reason}`,
      ).toBe(false);
    }
  });
});
