/**
 * 上流の背中 4 分類をタキソノミーに写像する。
 *
 * | 上流 | 写像先 | 判断 |
 * |---|---|---|
 * | `lats` | 広背筋 | 1 対 1 |
 * | `lower back` | 脊柱起立筋 | 1 対 1 |
 * | `middle back` | 僧帽筋中下部・菱形筋 | 1 対 1（菱形筋は統合済み。ADR 0005） |
 * | `traps` | 僧帽筋**上部** または **中下部** | **判断が要る** |
 *
 * 上流の `traps` は僧帽筋全体を指しており、上部と中下部の区別がない。
 * 対象は延べ 90 件（primary 15 + secondary 75）。
 */
import type { MuscleId } from "../../src/taxonomy.ts";

export interface BackMapping {
  readonly muscles: readonly MuscleId[];
  readonly rule: string;
}

export interface BackMappingInput {
  readonly name: string;
  readonly force: string | null;
}

const UPPER: MuscleId = "trapezius_upper";
const MIDDLE_LOWER: MuscleId = "trapezius_middle_lower";

/**
 * 僧帽筋の判定ルール。上から順に適用する。
 *
 * **軸は肩甲骨に何をさせているか。**
 *
 * - 引き寄せる（内転）→ 中下部
 * - 持ち上げる（挙上）、支える（等尺性）→ 上部
 */
const TRAPS_RULES: readonly { readonly pattern: RegExp; readonly mapping: BackMapping }[] = [
  {
    pattern: /shrug/i,
    mapping: { muscles: [UPPER], rule: "上部: シュラッグ（肩甲骨挙上そのもの）" },
  },
  {
    pattern: /upright/i,
    mapping: { muscles: [UPPER], rule: "上部: アップライトロウ（挙上を伴う）" },
  },
  {
    // 肩甲骨内転が主目的の種目
    pattern:
      /band pull[- ]?apart|face pull|rear[- ]?delt|reverse (fly|flye|machine fly)|bent[- ]?over.*(lateral|raise|fly)|seated lateral/i,
    mapping: { muscles: [MIDDLE_LOWER], rule: "中下部: 肩甲骨内転が主目的" },
  },
  {
    // 引く動作全般。肩甲骨を引き寄せる。
    pattern: /\brows?\b|pulldown|pull[- ]?up|chin[- ]?up|muscle[- ]?up|pullover/i,
    mapping: { muscles: [MIDDLE_LOWER], rule: "中下部: 引く動作（肩甲骨内転）" },
  },
  {
    // 重量を保持・運搬する種目。僧帽筋上部が等尺性に肩甲帯を支える。
    pattern:
      /deadlift|rack pull|carry|farmer|\bhold\b|\bwalk\b|yoke|clean|snatch|high pull|atlas stone|keg|sandbag|tire flip|power stairs|log lift|circus bell|jefferson/i,
    mapping: { muscles: [UPPER], rule: "上部: 保持・運搬（等尺性の支持）" },
  },
  {
    // 頭上への挙上。肩甲骨の上方回旋に僧帽筋上部が働く。
    pattern: /\bpress\b|\braises?\b|scaption|overhead|iron cross|rack delivery/i,
    mapping: { muscles: [UPPER], rule: "上部: 頭上挙上（肩甲骨の上方回旋）" },
  },
];

function mapTraps(input: BackMappingInput): BackMapping {
  for (const { pattern, mapping } of TRAPS_RULES) {
    if (pattern.test(input.name)) return mapping;
  }
  // 名前で決まらない場合、引く動作なら内転、それ以外は支持とみなす
  if (input.force === "pull") {
    return { muscles: [MIDDLE_LOWER], rule: "中下部: 引く動作の補助（force=pull）" };
  }
  return { muscles: [UPPER], rule: "上部: 支持（既定）" };
}

/** 1 対 1 で写せる上流部位。 */
const DIRECT: Readonly<Record<string, MuscleId>> = {
  lats: "latissimus_dorsi",
  "lower back": "erector_spinae",
  "middle back": "trapezius_middle_lower",
};

/**
 * 上流の背中の部位をタキソノミーに写像する。
 *
 * @param upstreamMuscle 上流の部位名（`lats` / `traps` / `middle back` / `lower back`）
 * @returns 背中の部位でなければ null
 */
export function mapBack(upstreamMuscle: string, input: BackMappingInput): BackMapping | null {
  const direct = DIRECT[upstreamMuscle];
  if (direct) return { muscles: [direct], rule: `1 対 1: ${upstreamMuscle}` };
  if (upstreamMuscle === "traps") return mapTraps(input);
  return null;
}
