import { PRIMARY_MUSCLE_OVERRIDES } from "./overrides/primary-muscles.ts";
import type { UpstreamExercise } from "./upstream.ts";

/**
 * primaryMuscles の上書きを 1 件に適用する。
 *
 * secondary は自動で調整する。
 *
 * - 新しい primary に入ったものは secondary から取り除く
 * - 元の primary のうち新しい primary に入らなかったものは secondary へ降ろす
 *
 * デッドリフトなら `primary: [lower back]` → `primary: [hamstrings, glutes]` と指定するだけで、
 * `lower back` が secondary に降り、`hamstrings` / `glutes` が secondary から消える。
 * **主働筋から外しただけで「関与しない」ことにはならない**ので、降ろす処理が要る。
 */
export function applyPrimaryOverride(exercise: UpstreamExercise): UpstreamExercise {
  const override = PRIMARY_MUSCLE_OVERRIDES[exercise.id];
  if (!override) return exercise;

  const primaryMuscles = override.primaryMuscles;
  const demoted = exercise.primaryMuscles.filter((m) => !primaryMuscles.includes(m));
  const kept = exercise.secondaryMuscles.filter((m) => !primaryMuscles.includes(m));

  return {
    ...exercise,
    primaryMuscles,
    secondaryMuscles: [...new Set([...demoted, ...kept])].toSorted(),
  };
}

/**
 * 上書き定義のうち、上流に存在しない id を返す。
 *
 * 上流が種目を改名・削除すると、上書きが黙って効かなくなる。
 * **黙って効かなくなるのが最悪**なので、テストで検出する。
 */
export function findStaleOverrides(exercises: readonly UpstreamExercise[]): string[] {
  const ids = new Set(exercises.map((ex) => ex.id));
  return Object.keys(PRIMARY_MUSCLE_OVERRIDES).filter((id) => !ids.has(id));
}
