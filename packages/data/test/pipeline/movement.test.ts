import { describe, expect, it } from "vitest";
import { expandMuscles } from "../../pipeline/mapping/expand.ts";
import { mapMovementPattern } from "../../pipeline/mapping/movement.ts";
import { mergeUpstream } from "../../pipeline/merge/merge.ts";
import { isTargetCategory, loadUpstream } from "../../pipeline/upstream.ts";

function patternOf(baseName: string): string {
  return mapMovementPattern(baseName).pattern;
}

describe("動作パターンの判定（§5.2）", () => {
  it("押す動作を面で分ける", () => {
    expect(patternOf("bench press")).toBe("horizontal_press");
    expect(patternOf("incline bench press")).toBe("incline_press");
    expect(patternOf("shoulder press")).toBe("vertical_press");
  });

  it("フライとプレスを分ける", () => {
    // ここを分けないと §7 の「胸のみ」ケースで水平プレス 5 種目が並ぶ。
    expect(patternOf("dumbbell flye")).toBe("horizontal_adduction");
    expect(patternOf("crossover")).toBe("horizontal_adduction");
  });

  it("股関節を伸展するブリッジは体幹種目ではない", () => {
    expect(patternOf("barbell glute bridge")).toBe("hinge");
    expect(patternOf("physioball hip bridge")).toBe("hinge");
    expect(patternOf("butt lift (bridge)")).toBe("hinge");
    // サイドブリッジは体幹の抗側屈なので、こちらは体幹に残す。
    expect(patternOf("side bridge")).toBe("trunk_antiextension");
  });

  it("引く動作を面で分ける", () => {
    expect(patternOf("bent over row")).toBe("horizontal_pull");
    expect(patternOf("wide grip lat pulldown")).toBe("vertical_pull");
  });

  it("下半身を股関節優位と膝関節優位で分ける", () => {
    expect(patternOf("deadlift")).toBe("hinge");
    expect(patternOf("squat")).toBe("squat");
    expect(patternOf("walking lunge")).toBe("lunge");
  });

  it("手首と肘を分ける", () => {
    // リストカールは肘を曲げない。elbow_flexion に入れると多様性制約が誤作動する。
    expect(patternOf("seated palm up wrist curl")).toBe("wrist_flexion");
    expect(patternOf("preacher curl")).toBe("elbow_flexion");
  });

  it("跳ぶ動作と投げる動作を分ける", () => {
    expect(patternOf("box jump")).toBe("jump");
    expect(patternOf("medicine ball slam")).toBe("throw");
  });

  it("判別できないものは理由が残る", () => {
    const result = mapMovementPattern("seated head harness neck resistance");
    expect(result.pattern).toBe("other");
    expect(result.rule).toContain("当たらない");
  });

  it("当たったルールが分かる", () => {
    expect(mapMovementPattern("bench press").rule.length).toBeGreaterThan(0);
  });
});

/**
 * ルールは上から順に当たる。広い語のルールが上位にあると、下位の具体的なルールへ到達しない。
 * **多様性項は「他と違うパターン」を無条件に加点するので、誤判定された種目を積極的に選ぶ。**
 */
describe("広いキーワードによる覆い隠し", () => {
  /**
   * 上のルールが広いキーワードで先に拾ってしまう組。
   * **多様性項は「他と違うパターン」を無条件に加点するので、誤判定された種目を積極的に選ぶ。**
   */
  it("先に当たる広いルールに胸の種目を奪われない", () => {
    // butterfly は \bfly\b に当たらない。r と fly の間に語境界がないため。
    expect(patternOf("butterfly")).toBe("horizontal_adduction");
    expect(patternOf("incline dumbbell flyes - with a twist")).toBe("horizontal_adduction");
    // ひねりを持つ体幹種目まで胸に寄せない。
    expect(patternOf("cable russian twists")).toBe("trunk_rotation");
    expect(patternOf("plate twist")).toBe("trunk_rotation");
  });

  /**
   * 握力種目のために置いた `\bgrip\b` が、グリップ幅を名前に持つ種目を全部さらっていた。
   * **グリップ幅は握り方の指定であって、握力を鍛える動作ではない。**
   */
  it("グリップ幅の指定を握力種目と見なさない", () => {
    expect(patternOf("mixed grip chin")).toBe("vertical_pull");
    expect(patternOf("close grip curl")).toBe("elbow_flexion");
    expect(patternOf("wide grip standing curl")).toBe("elbow_flexion");
    expect(patternOf("reverse grip pushdown")).toBe("elbow_extension");
    expect(patternOf("extension pronated grip")).toBe("elbow_extension");
    expect(patternOf("lying close grip extension behind the head")).toBe("elbow_extension");
    expect(patternOf("close grip press")).toBe("elbow_extension");
    // 下の垂直プルが `\bchin\b` で拾う位置にある。三頭のプレスを先に採れているか。
    expect(patternOf("lying close grip triceps press to chin")).toBe("elbow_extension");
  });

  it("握力そのものの種目は握力に残す", () => {
    expect(patternOf("plate pinch")).toBe("wrist_flexion");
    expect(patternOf("standing olympic plate hand squeeze")).toBe("wrist_flexion");
    expect(patternOf("wrist roller")).toBe("wrist_flexion");
  });

  /** 荷重に使う器具の名前は動作を決めない。 */
  it("器具の名前に動作を引きずられない", () => {
    // カーフマシンはシュラッグの荷重に使っているだけ。
    expect(patternOf("calf shoulder shrug")).toBe("shoulder_raise");
    expect(patternOf("standing calf raise")).toBe("calf_raise");
    // 除外はカーフマシンを荷重に使う形だけに効かせる。名前に shrug があれば何でも外す、ではない。
    expect(patternOf("calf raise shrug")).toBe("calf_raise");
    // ハイプーリーは滑車の位置。ハイプルではない。
    expect(patternOf("kneeling high pulley row")).toBe("horizontal_pull");
    expect(patternOf("lying close grip bar curl on high pulley")).toBe("elbow_flexion");
    expect(patternOf("sumo high pull")).toBe("hinge");
  });

  /** ゴールデンセットの差分で見つかった。プッシュダウンは押す動作ではない。 */
  it("インクラインが下位のプッシュダウンを覆わない", () => {
    expect(patternOf("incline pushdown")).toBe("elbow_extension");
    expect(patternOf("incline push up")).toBe("incline_press");
  });

  it("クリーングリップはクリーンではない", () => {
    expect(patternOf("front squat clean grip")).toBe("squat");
    expect(patternOf("hang clean")).toBe("hinge");
  });

  it("ドラッグカールは運搬ではない", () => {
    expect(patternOf("drag curl")).toBe("elbow_flexion");
    expect(patternOf("sled drag")).toBe("carry");
  });

  /** 三頭のプレスは肘の伸展。肩や胸のプレスと同じ形の名前を持つ。 */
  it("三頭のプレスを肩・胸のプレスと分ける", () => {
    expect(patternOf("lying triceps press")).toBe("elbow_extension");
    expect(patternOf("seated triceps press")).toBe("elbow_extension");
    expect(patternOf("body tricep press")).toBe("elbow_extension");
    expect(patternOf("seated press")).toBe("vertical_press");
    expect(patternOf("reverse triceps bench press")).toBe("horizontal_press");
  });
});

/**
 * 上流が主働筋を chest としているのに胸の動作へ落ちていなかった組（#56）。
 * **`isometric` は収縮様式で、動作パターンではない。**
 * 同じ語から胸の内転にも体幹にも行きうるので、判定のキーワードには使えない。
 */
describe("収縮様式と移動手段に動作を引きずられない", () => {
  it("等尺性の胸の種目を体幹種目にしない", () => {
    expect(patternOf("isometric chest squeeze")).toBe("horizontal_adduction");
    expect(patternOf("isometric wiper")).toBe("horizontal_press");
  });

  it("ベンチ上で腕が描く弧を体幹の回旋にしない", () => {
    expect(patternOf("around the world")).toBe("horizontal_adduction");
  });

  it("押しながら移動する種目は押す動作にする", () => {
    expect(patternOf("forward drag with press")).toBe("horizontal_press");
    expect(patternOf("backward drag")).toBe("carry");
  });

  it("腰をひねって押す種目は股関節の屈伸ではない", () => {
    expect(patternOf("heavy bag thrust")).toBe("horizontal_press");
    expect(patternOf("hip thrust")).toBe("hinge");
  });

  it("バンドでの側方移動は運搬ではなく股関節の外転", () => {
    expect(patternOf("monster walk")).toBe("leg_isolation");
    expect(patternOf("farmer walk")).toBe("carry");
  });
});

describe("上流データ全件", () => {
  it("データセットに載るレコードで other が出ない", async () => {
    // other が増えると §5.2 の多様性制約が効かなくなる。
    const all = (await loadUpstream()).filter(isTargetCategory);
    // 主働筋が空のレコードはデータセットに載らない（expand.ts の 12 件）。
    const kept = new Set(
      all.filter((ex) => expandMuscles(ex).primary.length > 0).map((ex) => ex.id),
    );
    const others = mergeUpstream(all)
      .filter((record) => record.sourceIds.some((id) => kept.has(id)))
      .filter((record) => mapMovementPattern(record.baseName).pattern === "other");
    expect(others.map((record) => record.baseName)).toEqual([]);
  });

  it("同じ入力から同じ出力が出る", async () => {
    const all = (await loadUpstream()).filter(isTargetCategory);
    for (const record of mergeUpstream(all)) {
      expect(mapMovementPattern(record.baseName)).toEqual(mapMovementPattern(record.baseName));
    }
  });
});
