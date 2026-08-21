/**
 * 選択結果を端末で目視するための CLI（design.md §10 の M3 完了条件）。
 *
 * **M3 まではフロントエンドを書かない。** 中身を固めるにはこれで足りる。
 *
 * 引数の解釈だけを担い、選択そのものは select.ts に投げる。
 * `bin/mtr.ts` が入口で、ここは argv と dataset を受けて文字列を返す純関数にしてある。
 */
import { parseArgs } from "node:util";
import {
  EQUIPMENT,
  MUSCLES,
  MUSCLE_GROUPS,
  MUSCLE_IDS,
  isMuscleId,
  musclesInGroup,
  type Equipment,
  type Exercise,
  type MuscleGroup,
  type MuscleId,
} from "@mtr/data";
import { formatSelection } from "./format.ts";
import { selectExercises } from "./select.ts";
import type { SelectionRequest } from "./types.ts";

/** §3 の範囲。 */
const COUNT_RANGE = { min: 1, max: 10 } as const;
const DEFAULT_COUNT = 6;

const USAGE =
  "使い方: pnpm mtr --targets <部位> [--count <1-10>] [--equipment <器具>]\n" +
  "  部位・器具はカンマ区切り。部位は筋肉 ID か部位グループ名。";

function fail(message: string): never {
  throw new Error(`${message}\n\n${USAGE}`);
}

function splitList(value: string): string[] {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

/**
 * 前方一致で候補を出す。
 *
 * **`triceps` は `triceps_brachii` と `triceps_surae` のどちらとも決まらない。**
 * 勝手に補完すると別の筋を鍛える結果が黙って返るので、候補を見せて選ばせる。
 */
function suggest(token: string): string {
  const candidates = MUSCLE_IDS.filter((muscle) => muscle.includes(token));
  return candidates.length === 0 ? "" : `\n  もしかして: ${candidates.join(", ")}`;
}

/**
 * 部位グループ名は所属する筋肉へ展開する。
 *
 * **知らない名前を黙って捨てない。** 捨てると要求より狭い部位で解いた結果が、
 * 成功したように見えて返る。
 */
function resolveTargets(tokens: readonly string[]): MuscleId[] {
  const resolved = new Set<MuscleId>();
  for (const token of tokens) {
    if (Object.hasOwn(MUSCLE_GROUPS, token)) {
      for (const muscle of musclesInGroup(token as MuscleGroup)) resolved.add(muscle);
    } else if (isMuscleId(token)) {
      resolved.add(token);
    } else {
      fail(
        `知らない部位です: ${token}${suggest(token)}\n` +
          `  部位グループ: ${Object.keys(MUSCLE_GROUPS).join(", ")}`,
      );
    }
  }
  return [...resolved];
}

function resolveEquipment(tokens: readonly string[]): Equipment[] {
  return tokens.map((token) => {
    if (!(EQUIPMENT as readonly string[]).includes(token)) {
      fail(`知らない器具です: ${token}\n  指定できる器具: ${EQUIPMENT.join(", ")}`);
    }
    return token as Equipment;
  });
}

function resolveCount(raw: string | undefined): number {
  if (raw === undefined) return DEFAULT_COUNT;
  const count = Number(raw);
  if (!Number.isInteger(count) || count < COUNT_RANGE.min || count > COUNT_RANGE.max) {
    fail(`種目数は ${COUNT_RANGE.min}〜${COUNT_RANGE.max} の整数です: ${raw}`);
  }
  return count;
}

export function parseRequest(argv: readonly string[]): SelectionRequest {
  const { values } = parseArgs({
    args: [...argv],
    options: {
      targets: { type: "string" },
      count: { type: "string" },
      equipment: { type: "string" },
    },
    // 知らないオプションを許すと、打ち間違えた条件が無視されたまま結果が返る。
    strict: true,
  });

  if (values.targets === undefined) fail("--targets が要ります。");
  const equipment =
    values.equipment === undefined ? undefined : resolveEquipment(splitList(values.equipment));

  return {
    targets: resolveTargets(splitList(values.targets)),
    count: resolveCount(values.count),
    allowedEquipment: equipment,
  };
}

export function runCli(argv: readonly string[], dataset: readonly Exercise[]): string {
  const request = parseRequest(argv);
  const targets = request.targets.map((muscle) => MUSCLES[muscle].ja).join("・");
  const equipment = request.allowedEquipment?.join("・") ?? "制限なし";

  return [
    `${targets} / ${request.count} 種目 / 器具: ${equipment}`,
    "",
    formatSelection(selectExercises(request, dataset)),
  ].join("\n");
}
