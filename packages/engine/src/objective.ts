import type { Exercise, MuscleId } from "@mtr/data";

export const OBJECTIVE_WEIGHTS = { coverage: 0, diversity: 0, compound: 0 };

export function coverageTerm(_set: readonly Exercise[], _targets: readonly MuscleId[]): number {
  throw new Error("未実装");
}

export function diversityTerm(_set: readonly Exercise[]): number {
  throw new Error("未実装");
}

export function compoundTerm(_set: readonly Exercise[]): number {
  throw new Error("未実装");
}

export function objective(_set: readonly Exercise[], _targets: readonly MuscleId[]): number {
  throw new Error("未実装");
}
