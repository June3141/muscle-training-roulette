import type { Exercise, MuscleId } from "@mtr/data";

export function primaryMuscleOf(_exercise: Exercise): MuscleId {
  throw new Error("未実装");
}

export function orderExercises(
  _set: readonly Exercise[],
  _targets: readonly MuscleId[],
): Exercise[] {
  throw new Error("未実装");
}
