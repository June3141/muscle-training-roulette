#!/usr/bin/env node
/**
 * CLI の入口。引数の解釈と整形は src/cli.ts。
 *
 * **ここに処理を足さない。** src/ の外なのでカバレッジの対象に入らず、
 * 壊れてもテストが気づかない。
 */
import { runCli } from "../src/cli.ts";
import { loadDataset } from "../src/dataset.ts";

try {
  console.log(runCli(process.argv.slice(2), loadDataset()));
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
