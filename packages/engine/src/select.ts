import type { SelectionRequest, SelectionResult } from "./types.ts";
import type { Exercise } from "@mtr/data";

export function selectExercises(
  _request: SelectionRequest,
  _dataset: readonly Exercise[],
): SelectionResult {
  throw new Error("未実装");
}
