/**
 * 上流の primaryMuscles を上書きする差分。
 *
 * **上流の値をそのまま書き換えるのではなく、差分として持つ。**
 * 上流が更新されたときに再適用でき、「どこを何のために変えたか」が残るため。
 *
 * キーは上流の id。値には必ず理由を書く。
 *
 * ## 判断基準
 *
 * **同じ動作なのに primaryMuscles が割れているグループだけを見る**（`pnpm data:audit`）。
 * 全件を見直さない。上流は「主働筋の入れ替わり」自体は正しく記録できている
 * （Close-Grip Bench Press → triceps）ので、上流全体を疑う必要はない。
 *
 * もう 1 つの入口が動作パターンと筋重みの矛盾検査（`test/pipeline/pattern-consistency.test.ts`）。
 * **audit は同じ動作の相手がいるレコードしか見ない。** 相手のいない種目や、
 * `MOVEMENT_KEYWORDS` に語が無い種目は割れとして出ないので、こちらの網でしか掛からない。
 *
 * 割れていても、以下は**正当な差異なので直さない**。
 *
 * - リストカール（forearms）とレッグカール（hamstrings）が「curl」で同居する類
 * - アップライトロウ（traps）とベントオーバーロウ（middle back）
 * - リアデルトフライ（shoulders）とダンベルフライ（chest）
 * - Board Press / Floor Press 系（triceps）— 可動域を制限して三頭を狙う意図の種目
 * - Kettlebell Turkish Get-Up (Squat style) — キーワードの誤マッチ
 * - デッドリフトの quadriceps 6 件 — 荷重が体側にあり、バーが前にあるものとは動作が違う
 * - Scapular Pull-Up（traps）— 肩甲骨を下制するだけで肘を曲げない
 * - Dips - Chest Version（chest）— 上流が三頭版と意図的に分けている
 * - Leg Press / Calf Press / Pallof Press / Press Sit-Up / Jerk Dip Squat — キーワードの誤マッチ
 * - Weighted Ball Hyperextension（lower back）— 腰椎を曲げて上体を起こす種目で脊柱が実際に動く
 * - Seated Good Mornings（lower back）— 座位で膝が屈曲しハムが働きにくい。上流も補助筋に置いていない
 *
 * **判定していない割れをここに書かない。** 書くと判定済みに見えて、次に読む人が素通りする。
 * 未判定のものは Issue で追う。
 */

export interface PrimaryMuscleOverride {
  /** 上書き後の primaryMuscles（上流の語彙のまま。タキソノミーへの写像は別工程） */
  readonly primaryMuscles: readonly string[];
  /** なぜ上流が誤っていると判断したか */
  readonly reason: string;
}

const DEADLIFT_REASON =
  "コンベンショナルデッドリフトの主働筋は股関節伸展筋（ハムストリングスと大臀筋）。" +
  "脊柱起立筋は脊柱を中立に保つ等尺性の働きであって主働筋ではない。" +
  "上流はこの 6 件だけ lower back としており、同じ動作の Romanian Deadlift や " +
  "Sumo Deadlift は hamstrings にしている（`pnpm data:audit` で確認できる）。";

const CHIN_UP_REASON =
  "チンアップの主働筋は広背筋。グリップと片手/両手は主働筋を入れ替えない。" +
  "`pnpm data:audit` の chin / chin-up / pull-up グループは 14 件で、" +
  "うち 9 件が lats、middle back はこの 2 件だけ。" +
  "肩甲骨を下制するだけの Scapular Pull-Up は肘を曲げないので traps のままでよい。";

const RACK_PULL_REASON =
  "ラックプルは可動域を切ったデッドリフトで、解説文も proper deadlifting position と書く。" +
  "背中のアーチは等尺性の保持で、上体を起こすのは股関節と膝の伸展。" +
  "上流も補助筋に glutes と hamstrings を置いている。" +
  "2 件とも lower back で揃っているため割れにならず、`pnpm data:audit` には出ない。" +
  "種目名に deadlift を含まないので、デッドリフト 6 件の検査にも掛からない。";

const FLAT_BACK_HINGE_REASON =
  "解説文が「背中を平らに保つ」「まっすぐな背中を保つ」と明記していて脊柱は動かない。" +
  "股関節の伸展で上体を起こす動作なので主働筋はハムストリングスと大臀筋。" +
  "脊柱起立筋の等尺性の働きを主働筋にしないのはデッドリフト 6 件と同じ判断。" +
  "グッドモーニングは同じ動作の 5 件を上流も hamstrings にしており、" +
  "Stiff Leg は膝のことで脊柱のことではない。" +
  "腰椎を曲げて上体を起こす Weighted Ball Hyperextension は対象外。";

const BENCH_PRESS_REASON =
  "通常のベンチプレスであり、主働筋は大胸筋。チェーンやリバースバンドは" +
  "負荷曲線を変えるだけで主働筋を変えない。上流で triceps とされている他の 3 件" +
  "（Close-Grip 2 件、Reverse Triceps）はグリップで主働筋が入れ替わるので正しい。";

export const PRIMARY_MUSCLE_OVERRIDES: Record<string, PrimaryMuscleOverride> = {
  // --- デッドリフト系: lower back → hamstrings + glutes ---
  Barbell_Deadlift: { primaryMuscles: ["hamstrings", "glutes"], reason: DEADLIFT_REASON },
  Axle_Deadlift: { primaryMuscles: ["hamstrings", "glutes"], reason: DEADLIFT_REASON },
  Deadlift_with_Bands: { primaryMuscles: ["hamstrings", "glutes"], reason: DEADLIFT_REASON },
  Deadlift_with_Chains: { primaryMuscles: ["hamstrings", "glutes"], reason: DEADLIFT_REASON },
  Deficit_Deadlift: { primaryMuscles: ["hamstrings", "glutes"], reason: DEADLIFT_REASON },
  Reverse_Band_Deadlift: { primaryMuscles: ["hamstrings", "glutes"], reason: DEADLIFT_REASON },

  // --- ベンチプレス系: triceps → chest ---
  "Bench_Press_-_Powerlifting": { primaryMuscles: ["chest"], reason: BENCH_PRESS_REASON },
  Bench_Press_with_Chains: { primaryMuscles: ["chest"], reason: BENCH_PRESS_REASON },
  Reverse_Band_Bench_Press: { primaryMuscles: ["chest"], reason: BENCH_PRESS_REASON },

  // --- チンアップ系: middle back → lats ---
  Rack_Pulls: { primaryMuscles: ["hamstrings", "glutes"], reason: RACK_PULL_REASON },
  Rack_Pull_with_Bands: { primaryMuscles: ["hamstrings", "glutes"], reason: RACK_PULL_REASON },

  Mixed_Grip_Chin: { primaryMuscles: ["lats"], reason: CHIN_UP_REASON },
  "One_Arm_Chin-Up": { primaryMuscles: ["lats"], reason: CHIN_UP_REASON },

  // --- スプリント系: abdominals → quadriceps ---
  Hyperextensions_Back_Extensions: {
    primaryMuscles: ["hamstrings", "glutes"],
    reason: FLAT_BACK_HINGE_REASON,
  },
  Hyperextensions_With_No_Hyperextension_Bench: {
    primaryMuscles: ["hamstrings", "glutes"],
    reason: FLAT_BACK_HINGE_REASON,
  },
  Stiff_Leg_Barbell_Good_Morning: {
    primaryMuscles: ["hamstrings", "glutes"],
    reason: FLAT_BACK_HINGE_REASON,
  },

  Wind_Sprints: {
    primaryMuscles: ["quadriceps"],
    reason:
      "走種目の主働筋は下肢。対象カテゴリのスプリント 5 件のうち abdominals としているのは" +
      "この 1 件だけで、Bench Sprint / Lunge Sprint / Side Hop-Sprint / " +
      "Single-Cone Sprint Drill はすべて quadriceps にしている。" +
      "うち Lunge Sprint は同じ strength カテゴリ。" +
      "補助筋も空なので、このままでは下肢に 1 g も配分されない。",
  },
};
