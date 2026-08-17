/**
 * 上流の `shoulders`（一塊）を三角筋 前部/中部/後部に写像する。
 *
 * **対象は延べ 318 件**（primary 117 + secondary 201）。単一部位としては最多で、
 * ここの精度が Q1（特に効く部位を表現できるか）の検証力を最も左右する。
 * 分割しないとサイドレイズとショルダープレスが同じ場所を光らせる。
 *
 * ここで決めるのは**どの分類に属するか**だけ。比率は M2 の重み生成で決める。
 */
import type { MuscleId } from "../../src/taxonomy.ts";
import { SHOULDER_OVERRIDES } from "./shoulder-overrides.ts";

export interface ShoulderMapping {
  readonly muscles: readonly MuscleId[];
  /** どのルールで判定したか。判別の根拠を追えるようにする。 */
  readonly rule: string;
}

/**
 * 判定ルール。**上から順に適用し、最初に当たったものを採る。**
 *
 * 順序が意味を持つ。`Bent Over Lateral Raise` は「後部」であって「中部」ではないので、
 * 後部のパターンを先に置いている。
 */
const RULES: readonly { readonly pattern: RegExp; readonly mapping: ShoulderMapping }[] = [
  {
    // リアデルト、リバースフライ、ベントオーバー系。肩関節水平外転。
    pattern:
      /rear[- ]?delt|reverse (fly|flye|machine fly)|back fly|bent[- ]?over.*(raise|fly|flye)|band pull[- ]?apart|face pull|rear lateral/i,
    mapping: { muscles: ["deltoid_posterior"], rule: "後部: 水平外転系" },
  },
  {
    // アップライトロウは中部主体（僧帽上部は別途 traps 側で写す）
    pattern: /upright.*row|row.*upright/i,
    mapping: { muscles: ["deltoid_lateral"], rule: "中部: アップライトロウ" },
  },
  {
    // サイドレイズ系。肩関節外転。
    pattern: /lateral raise|side raise|side lateral|lateral.*raise/i,
    mapping: { muscles: ["deltoid_lateral"], rule: "中部: 外転系" },
  },
  {
    // フロントレイズ系。肩関節屈曲。
    pattern: /front[- ]?delt|scaption|^front\b.*\braises?\b|\bfront .*raises?\b/i,
    mapping: { muscles: ["deltoid_anterior"], rule: "前部: 屈曲系" },
  },
  {
    // インクラインショルダーレイズ（肩甲骨面での挙上）
    pattern: /incline shoulder raise/i,
    mapping: { muscles: ["deltoid_anterior"], rule: "前部: インクラインショルダーレイズ" },
  },
  {
    // オーバーヘッドプレス系。前部主体で中部が従。比率は M2 で決める。
    pattern:
      /\bpress(es)?\b|\bjerk\b|thruster|handstand push|log lift|rack delivery|linear jammer/i,
    mapping: {
      muscles: ["deltoid_anterior", "deltoid_lateral"],
      rule: "前部+中部: オーバーヘッドプレス系",
    },
  },
  {
    // 頭上へ放る/担ぐ系。プレスと同じ扱い。
    pattern: /\boverhead\b|snatch|clean|circus bell|crucifix|iron cross/i,
    mapping: {
      muscles: ["deltoid_anterior", "deltoid_lateral"],
      rule: "前部+中部: 頭上動作",
    },
  },
];

/**
 * 判別不能として扱うもの。
 *
 * **黙って三角筋に寄せない。** タキソノミーに該当分類がない種目を
 * 無理に写すと、重みの意味が壊れる。
 */
const UNMAPPABLE: readonly { readonly pattern: RegExp; readonly reason: string }[] = [
  {
    // 先頭から「(器具) External/Internal Rotation」の形だけを拾う。
    // 「Reverse Flyes With External Rotation」は三角筋後部の種目なので巻き込まない。
    pattern: /^(cable |dumbbell |band )?(external|internal) rotation/i,
    reason: "純粋なローテーターカフ種目。§4.3 のタキソノミーに該当分類がない",
  },
  {
    pattern: /turkish get[- ]?up/i,
    reason: "全身種目。特定の三角筋部位に寄せられない",
  },
];

export interface UnmappableShoulder {
  readonly reason: string;
}

/** 判定に必要な最小の入力。上流レコードをそのまま渡せる。 */
export interface ShoulderMappingInput {
  readonly id: string;
  readonly name: string;
  readonly force: string | null;
  readonly primaryMuscles: readonly string[];
}

/**
 * `force` から補助としての三角筋を推定する。
 *
 * **肩の種目ではなく、他部位の種目に補助として入っている `shoulders` 用。**
 * ベンチプレスやディップスの肩は前部、ロウやプルダウンの肩は後部に働く。
 * 名前からは判別できないが、押す動作か引く動作かが分かれば決まる。
 */
function mapByForce(force: string | null): ShoulderMapping | null {
  if (force === "push") {
    return { muscles: ["deltoid_anterior"], rule: "前部: 押す動作の補助（force=push）" };
  }
  if (force === "pull") {
    return { muscles: ["deltoid_posterior"], rule: "後部: 引く動作の補助（force=pull）" };
  }
  return null;
}

/**
 * 三角筋の部位を判定する。
 *
 * 名前のパターンを先に見て、当たらなければ `force` から推定する。
 * **肩が主働筋の種目は名前で判別でき、補助として入っている場合は動作方向で決まる。**
 *
 * @returns 判定できた場合は写像、できない場合は理由付きの結果、ルールがなければ null
 */
export function mapShoulders(
  input: ShoulderMappingInput,
): ShoulderMapping | UnmappableShoulder | null {
  const override = SHOULDER_OVERRIDES[input.id];
  if (override) return { muscles: override.muscles, rule: "手動判定（instructions を読んで決定）" };

  for (const { pattern, reason } of UNMAPPABLE) {
    if (pattern.test(input.name)) return { reason };
  }
  for (const { pattern, mapping } of RULES) {
    if (pattern.test(input.name)) return mapping;
  }
  // 肩が主働筋なのに名前で判別できないものは、force に頼らず個別に判断する
  if (input.primaryMuscles.includes("shoulders")) return null;
  return mapByForce(input.force);
}

export function isUnmappable(
  result: ShoulderMapping | UnmappableShoulder | null,
): result is UnmappableShoulder {
  return result !== null && "reason" in result;
}
