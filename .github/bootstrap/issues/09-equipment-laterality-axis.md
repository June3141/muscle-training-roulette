---
title: "[M1] 器具・片手両手を独立軸として付与し、無効な組み合わせを検出する（Q2）"
labels: taxonomy, data, engine
milestone: M1
---
design.md §2 の **Q2「器具・グリップを独立軸として扱えるか」** の本体。
検証されたと言えるのは「無効な組み合わせが検出でき、有効なものだけが生成される」状態。

## やること

上流は 1 種目 1 器具（`equipment` は単一値、null が 77 件）。
これを `equipmentOptions` + `defaultEquipment` に展開する。

つまり **「バーベルベンチプレス」と「ダンベルベンチプレス」を 1 種目に統合する**判断が要る。
上流では別種目として登録されているものを畳む作業になるので、id の統廃合が発生する。

## 統合の基準 —「主働筋が入れ替わらない差異のみを軸にする」

ADR 0002 の原則。**これは `primaryMuscles` の比較で機械的に判定できる。**

上流はグリップによる主働筋の入れ替わりを既に記録している。

| 種目                               | primaryMuscles |
| ---------------------------------- | -------------- |
| Barbell Bench Press - Medium Grip  | `chest`        |
| **Close-Grip** Barbell Bench Press | **`triceps`**  |
| Wide-Grip Barbell Bench Press      | `chest`        |

手順:

1. ベース名でグルーピングする
2. `primaryMuscles` が一致するものを畳んで `equipmentOptions` に入れる
3. `primaryMuscles` が異なるものは別種目のまま残す

Close-Grip は自動的に分離され、Wide-Grip は自動的に畳まれる。

> [!IMPORTANT]
> **判定に使う `primaryMuscles` は、監査を通した後の値であること。**
> 上流の値には不整合がある（デッドリフト系が 3 分裂）。
> Issue「上流の primaryMuscles を監査してから M2 に渡す」を先に片付ける。

### 名前マッチだけでは足りない

機械的な名前マッチ（器具名・グリップ表記を剥がす）で畳めるのは
**strength 581 件中 54〜68 件**にとどまる。
`Barbell Bench Press - Medium Grip` と `Dumbbell Bench Press` は表記が揃っていないため。
残りはベース名の正規化ルールを足すか、LLM 支援で寄せる。

## 無効な組み合わせの例

- スミスマシンは軌道が固定されているので `unilateral` を選べない
- 自重種目は器具の付け替えができない
- バーベルは構造上 `unilateral` にならない

`packages/data/test/schema.test.ts` の「器具とグリップの組み合わせ検証（Q2）」に
`it.todo` で置いてある。**まずこれを失敗するテストに書き換えてから**実装する。

## 完了条件

- [ ] 統合ルール（どの種目を畳むか）が機械的に適用されている
- [ ] 無効な組み合わせがスキーマ検証で弾かれる
- [ ] 上流の `equipment` が null の 77 件の扱いが決まっている
