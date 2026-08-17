import type { Equipment, Exercise, MuscleId } from "@mtr/data";

/** 選択エンジンへの入力（design.md §6 の [1][2]）。 */
export interface SelectionRequest {
  /** 対象部位。筋肉 ID で指定する。部位数は自由。 */
  targets: readonly MuscleId[];
  /** 種目数（1〜10）。 */
  count: number;
  /** 器具フィルタ。空なら制限なし。 */
  allowedEquipment?: readonly Equipment[];
}

/** 選ばれた 1 種目。器具と片手/両手は選択後に切り替えられる（§6 の [4]）。 */
export interface SelectedExercise {
  exercise: Exercise;
  equipment: Equipment;
  laterality: Exercise["defaultLaterality"];
}

/** 部位ごとのカバレッジ。値は選択セット全体での重みの合計。 */
export type Coverage = Partial<Record<MuscleId, number>>;

export interface SelectionResult {
  /** 実行順に並んだ種目（§5.3）。 */
  exercises: readonly SelectedExercise[];
  coverage: Coverage;
  /**
   * 要求された部位のうち、候補が足りずカバーできなかったもの。
   *
   * 空でないことは異常ではない。器具フィルタや部位数 > 種目数で普通に起きる（§5.4）。
   * 黙って埋まる部位だけ返すのではなく、必ずここに出す。
   */
  uncovered: readonly MuscleId[];
}
