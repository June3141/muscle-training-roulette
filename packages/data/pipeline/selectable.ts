/**
 * 選択エンジンの候補プールから外す種目（`selectable: false`）。
 *
 * **データセットには残る。** 重みも付ける。候補に出さないだけ。
 * 後から出す判断もできるように、削除ではなくフラグで管理する（Issue #3 の結論）。
 *
 * **カテゴリ単位ではなく種目単位で判断する。** カテゴリで切ると
 * 一般的な筋力種目まで落ちる（`docs/data-survey.md` の「対象範囲」を参照）。
 */

export interface NotSelectableReason {
  readonly reason: string;
}

export const NOT_SELECTABLE: Record<string, NotSelectableReason> = {
  // --- ローテーターカフ種目（ADR 0005） ---
  // §4.3 のタキソノミーに棘上筋・棘下筋・小円筋・肩甲下筋がないため写せない。
  // 深層筋なので人体図にも描けず、分類を足しても可視化の目盛りが増えるだけになる。
  // 「部位をカバーする種目セット」の提案には出てこないが、
  // 将来「肩の健康」を扱うときのためにデータとしては残す。
  External_Rotation: { reason: "ローテーターカフ種目。タキソノミーに該当分類がない" },
  External_Rotation_with_Band: { reason: "ローテーターカフ種目。タキソノミーに該当分類がない" },
  External_Rotation_with_Cable: { reason: "ローテーターカフ種目。タキソノミーに該当分類がない" },
  Internal_Rotation_with_Band: { reason: "ローテーターカフ種目。タキソノミーに該当分類がない" },
  Cable_Internal_Rotation: { reason: "ローテーターカフ種目。タキソノミーに該当分類がない" },
};

export function isSelectable(id: string): boolean {
  return !(id in NOT_SELECTABLE);
}
