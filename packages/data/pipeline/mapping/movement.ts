/**
 * ベース名から動作パターンを判定する（design.md §5.2）。
 *
 * 多様性制約が減点に使う。**ここが粗いと「胸 5 種目が全部水平プレス」を検出できない。**
 *
 * 入力はベース名（器具名と片手/両手を落とした名前）。動作は器具で変わらないので、
 * `Barbell Bench Press` と `Dumbbell Bench Press` を別々に判定する理由がない。
 *
 * **判別できないものを黙って `other` に落とさない。** 理由を返し、テストで件数を固定する。
 */
import type { MovementPattern } from "../../src/axes.ts";

export interface MovementMapping {
  readonly pattern: MovementPattern;
  /** どのルールで決めたか。判別の根拠を追えるようにする。 */
  readonly rule: string;
}

/**
 * 判定ルール。**上から順に適用し、最初に当たったものを採る。**
 *
 * 順序が意味を持つ。`incline bench press` は水平プレスより先にインクラインへ、
 * `wrist curl` は肘屈曲より先に手首へ落とす必要がある。
 */
const RULES: readonly { readonly pattern: RegExp; readonly mapping: MovementMapping }[] = [
  {
    pattern:
      /\bcarry\b|farmer|yoke|suitcase|sandbag|keg carry|atlas stone|tire flip|power stair|log lift|circus bell|sled (push|pull)|conan|\bdrag\b(?! curl| with press)|(?<!monster )\bwalk\b|\bhold\b/,
    mapping: { pattern: "carry", rule: "保持・運搬" },
  },
  {
    // カーフマシンは荷重に使っているだけで、動作はシュラッグ。
    // **除外はこの並びだけに効かせる。** 名前のどこかに shrug があれば外す、にすると巻き添えが出る。
    pattern: /calf(?! shoulder shrug)/,
    mapping: { pattern: "calf_raise", rule: "下腿三頭筋の単関節" },
  },
  {
    pattern:
      /plank|ab wheel|ab roller|rollout|hollow|dead bug|bird dog|superman|pallof|cocoon|side bridge|balance board|downward facing balance|spider crawl|suspended fallout/,
    mapping: { pattern: "trunk_antiextension", rule: "体幹の抗伸展・抗回旋" },
  },
  {
    /**
     * ひねりを加えたフライは胸の種目。
     * **下の体幹回旋ルールが `twist` で先に拾うと、多様性項が「珍しいパターン」として加点する。**
     */
    pattern: /\bflyes?\b.*twist|twist.*\bflyes?\b/,
    mapping: { pattern: "horizontal_adduction", rule: "肘を伸ばしたまま水平内転（ひねり付き）" },
  },
  {
    pattern:
      /twist|russian|woodchop|\bchop\b|side bend|oblique|windmill|180|figure 8|spell caster|standing lift|(?<!isometric )wiper/,
    mapping: { pattern: "trunk_rotation", rule: "体幹の回旋・側屈" },
  },
  {
    /**
     * 片脚立位での屈伸。
     * **下の体幹屈曲より先に採る。** ステップアップに付いた膝上げが動作を決めてしまう。
     */
    pattern: /lunge|split squat|step[- ]?up|bulgarian|step over|pass between the leg/,
    mapping: { pattern: "lunge", rule: "片脚立位での屈伸" },
  },
  {
    pattern:
      /crunch|sit[- ]?up|leg raise|knee raise|leg lift|knee lift|v[- ]?up|jackknife|toe touch|hip raise|hip lift|hip flexion|scissor kick|flutter|frog|heel touch|reverse hyper|leg pull|mountain climber|otis up|seated leg tuck|elbow to knee|butt up|air bike|hanging pike|body up|london bridge/,
    mapping: { pattern: "trunk_flexion", rule: "体幹の屈曲" },
  },
  {
    pattern:
      /leg extension|leg curl|hamstring curl|hamstring slide|hip adduction|hip abduction|thigh (adductor|abductor)|kickback|glute ham raise|glute squeeze|monster walk|prone manual hamstring|floor glute ham/,
    mapping: { pattern: "leg_isolation", rule: "下肢の単関節" },
  },
  {
    pattern:
      /deadlift|good morning|hip thrust|glute bridge|butt lift|swing|\bclean\b(?! grip)|\bsnatch\b|romanian|back extension|hyperextension|hip extension|pull[- ]?through|rack pull|high pull\b|jefferson|physioball hip bridge|judo flip|keg load|stiff leg/,
    mapping: { pattern: "hinge", rule: "股関節優位の屈伸" },
  },
  {
    pattern: /squat|leg press|hack|sissy|wall sit/,
    mapping: { pattern: "squat", rule: "膝関節優位の屈伸" },
  },
  {
    /**
     * 三頭のプレスは肘の伸展。
     * **`press to chin` を下の垂直プルが `\bchin\b` で拾うので、その前に採る。**
     */
    pattern: /\btriceps? press\b|\bclose grip press\b/,
    mapping: { pattern: "elbow_extension", rule: "肘の伸展（三頭のプレス）" },
  },
  {
    pattern:
      /pulldown|pull[- ]?up|chin[- ]?up|muscle[- ]?up|pull[- ]?over|lat pull|gironda sternum|rope climb|\bchin\b/,
    mapping: { pattern: "vertical_pull", rule: "頭上から引く" },
  },
  {
    // アップライトロウは肩甲帯の挙上で、水平に引く動作ではない。row より先に採る。
    pattern: /upright row/,
    mapping: { pattern: "shoulder_raise", rule: "肩関節の単関節挙上（アップライトロウ）" },
  },
  {
    pattern:
      /\brows?\b|face pull|rear[- ]?delt|pull[- ]?apart|shotgun|incline bench pull|^pull$|moving claw/,
    mapping: { pattern: "horizontal_pull", rule: "水平に引く" },
  },
  {
    pattern:
      /shrug|lateral raise|front raise|side raise|scaption|upright row|deltoid raise|shoulder raise|plate raise|front two raise|front incline raise|side lateral|^raise$|delt raise|single raise|straight raise/,
    mapping: { pattern: "shoulder_raise", rule: "肩関節の単関節挙上" },
  },
  {
    pattern:
      /overhead press|shoulder press|military|push press|\bjerk\b|handstand|arnold|thruster|press behind|seated press|standing.*press|z press|bradford|cuban|anti gravity press|para press|bent press|neck press|rack delivery|car driver|jammer|see[- ]?saw/,
    mapping: { pattern: "vertical_press", rule: "頭上へ押す" },
  },
  {
    // プッシュダウンは押す動作ではない。`push\b` で pushdown を外す。
    pattern: /incline.*(press|push\b)|incline bench with palm/,
    mapping: { pattern: "incline_press", rule: "斜め上へ押す" },
  },
  {
    // butterfly は \bfly\b に当たらない。r と fly の間に語境界がないため。
    pattern:
      /\bfly\b|\bflye|butterfly|pec deck|crossover|cross over|iron cross|crucifix|svend press|chest squeeze|around the world/,
    mapping: { pattern: "horizontal_adduction", rule: "肘を伸ばしたまま水平内転" },
  },
  {
    pattern:
      /bench press|chest press|floor press|push[- ]?up|decline press|smith press|guillotine|board press|pin press|chain press|jm press|drag with press|heavy bag thrust|isometric wiper|drop push|push off|return push|\bdip\b|power partial|^press$/,
    mapping: { pattern: "horizontal_press", rule: "水平に押す" },
  },
  {
    pattern:
      /wrist curl|wrist rotation|reverse curl|finger curl|wrist roller|plate pinch|pronation|supination|bottom up|hand squeeze/,
    mapping: { pattern: "wrist_flexion", rule: "手関節・握力" },
  },
  {
    pattern: /curl/,
    mapping: { pattern: "elbow_flexion", rule: "肘の屈曲" },
  },
  {
    pattern: /extension|pushdown|push[- ]?down|skull|\bdips?\b|speed overhead|tate press/,
    mapping: { pattern: "elbow_extension", rule: "肘の伸展" },
  },
  {
    pattern: /throw|slam|toss|chest pass|chest push|pirate ship|battling rope|heavy bag/,
    mapping: { pattern: "throw", rule: "投擲" },
  },
  {
    pattern:
      /jump|hop\b|bound|leap|skip|plyo|box drill|sprint|\brun\b|drill|shuffle|carioca|butt kick|high knee|ladder|start technique|depth|burpee/,
    mapping: { pattern: "jump", rule: "跳躍・走" },
  },
  {
    // ローテーターカフ。タキソノミーに分類がなく、そもそもデータセットに載らない。
    pattern: /(external|internal) rotation|rotator/,
    mapping: { pattern: "other", rule: "ローテーターカフ（データセットに載らない）" },
  },
];

export function mapMovementPattern(baseName: string): MovementMapping {
  for (const { pattern, mapping } of RULES) {
    if (pattern.test(baseName)) return mapping;
  }
  return { pattern: "other", rule: "判別ルールに当たらない" };
}
