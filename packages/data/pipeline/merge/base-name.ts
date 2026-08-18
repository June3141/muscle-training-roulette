/**
 * 上流の種目名から**ベース名**を作る。
 *
 * `Barbell Bench Press - Medium Grip` と `Dumbbell Bench Press` を同一視するための正規化。
 * 器具と片手/両手は独立軸なので名前から落とす（ADR 0002、ADR 0006）。
 *
 * **落とさないものが重要。** 角度・グリップ幅・姿勢は別種目を意味するので残す。
 * ここで落としすぎると、クローズグリップベンチが胸の種目として畳まれる。
 */

/** 上流が既定のグリップを明示しているだけの表記。落としても種目は変わらない。 */
const DEFAULT_GRIP = /\s*-\s*medium grip\b/g;

/** 片手/両手。`lateralityOptions` の軸なので名前からは落とす。 */
const LATERALITY_WORDS = [
  /\b(one|single|1)[- ]?(arm|armed|leg|legged|hand|handed|sided?)\b/g,
  /\b(two|2|both)[- ]?(arm|armed|leg|legged|hand|handed)\b/g,
  /\balternat(e|ing)\b/g,
];

/**
 * 器具。`equipmentOptions` の軸なので名前からは落とす。
 *
 * ランドマイン・T バー・そり等は**落とさない**。器具が動作そのものを規定していて、
 * バーベルロウの器具違いではないため（ADR 0006 の「器具が動作を規定する場合」）。
 */
const EQUIPMENT_WORDS = [
  /\bsmith machine\b/g,
  /\bsmith\b/g,
  /\bbarbell\b/g,
  /\bdumbbells?\b/g,
  /\bdb\b/g,
  /\bkettlebells?\b/g,
  /\bcables?\b/g,
  /\bmachine\b/g,
  /\bez[- ]?bar\b/g,
  /\be-?z[- ]?curl bar\b/g,
  /\bbands?\b/g,
  /\bbodyweight\b/g,
  /\bbody weight\b/g,
  /\bexercise ball\b/g,
  /\bmedicine ball\b/g,
  /** Hammer Strength 系マシンの通称。上流の equipment は machine。 */
  /\blever(age)?\b/g,
];

/** 動作に何も足さない筋肉名の修飾。「Bicep Curl」と「Curl」は同じ種目。 */
const MUSCLE_WORDS = [/\bbiceps?\b/g, /\btriceps?\b/g];

/** 器具名を落とした結果、末尾に残ってしまう語。「Squats - With Bands」→「squat with」を防ぐ。 */
const DANGLING_TAIL = /\s+(with|and|a|an|the|of|to|in|on)$/;

function singularize(word: string): string {
  return word.length > 3 && word.endsWith("s") && !word.endsWith("ss") ? word.slice(0, -1) : word;
}

export function normalizeBaseName(name: string): string {
  let result = name.toLowerCase().replace(DEFAULT_GRIP, " ");
  for (const pattern of [...LATERALITY_WORDS, ...EQUIPMENT_WORDS, ...MUSCLE_WORDS]) {
    result = result.replace(pattern, " ");
  }
  result = result
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(" ")
    .map(singularize)
    .join(" ");
  return result.replace(DANGLING_TAIL, "").trim();
}
