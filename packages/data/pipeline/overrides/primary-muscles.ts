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

  // --- スプリント系: abdominals → quadriceps ---
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
