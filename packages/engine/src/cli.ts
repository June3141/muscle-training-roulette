import type { Exercise } from "@mtr/data";
import type { SelectionRequest } from "./types.ts";

export function parseRequest(_argv: readonly string[]): SelectionRequest {
  throw new Error("未実装");
}

export function runCli(_argv: readonly string[], _dataset: readonly Exercise[]): string {
  throw new Error("未実装");
}
