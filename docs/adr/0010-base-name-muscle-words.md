# ADR 0010: ベース名から筋肉名を落とす範囲

- ステータス: **Accepted**
- 日付: 2026-08-21
- 関連: ADR 0002, ADR 0006, ADR 0007

## 背景

ベース名の正規化（`pipeline/merge/base-name.ts`）は、器具・片手/両手と並べて
**筋肉名（`biceps` / `triceps`）も落としていた。**

根拠は「動作に何も足さない修飾」だった。`Bicep Curl` と `Curl` は同じ種目で、
`Tricep Extension` と `Extension` も同じ種目なので、落としても情報が減らない。

これがプレスで成立しない。

```
Lying Triceps Press   -> lying press
Seated Triceps Press  -> seated press
Seated Dumbbell Press -> seated press
```

`Seated Triceps Press` は肘の伸展、`Seated Dumbbell Press` は頭上へ押す動作で、
別の動作パターンに落ちるべき種目が同じベース名になる。
動作パターンの判定（`pipeline/mapping/movement.ts`）はベース名しか受け取らないので、
**名前が同じである限り分けられない。**

## 決定

**`press` を含む名前では筋肉名を落とさない。**

```
Lying Triceps Press   -> lying triceps press
Seated Triceps Press  -> seated triceps press
Seated Dumbbell Press -> seated press
Machine Bicep Curl    -> curl                  ← 変わらない
```

`triceps` はラテン語由来でこれが単数形なので、末尾の `s` を落とさない語に加える。
日本語名の辞書には「トライセプス」を足す。上流に `Tricep` と `Triceps` の両方の綴りがある。

## 理由

### なぜ動作パターン側で解かないか

ベース名が同じなら入力が同じで、出力を分ける手がかりが無い。
上流 id を鍵にした上書き表を作れば分けられるが、
**上書き表は「名前から判定する」という設計そのものを迂回する。**
名前が動作を語っているのに落としているのが原因なので、落とすのをやめる方が短い。

### なぜ `press` だけか

落とす根拠は「筋肉名が動作を語らない」ことだった。
`curl` と `extension` は動作を名指ししていて、筋肉名は重複した情報でしかない。
`press` は押す動作の総称で、どこへ押すかを筋肉名が決めている。

他の動作語に同じ性質があれば、その語も除外に加える。
今のデータで衝突しているのは `press` だけだった。

### 副作用として ADR 0007 の接尾辞が 4 組減る

ADR 0007 は同じベース名で主働筋が違うレコードに接尾辞を付けると決めた。
原因は「上流の `primaryMuscles` が同じ動作で割れていること」とされていたが、
**正規化で落としすぎたために別種目が同名になっている組が混ざっていた。**

```
- seated_press__deltoid_anterior_deltoid_lateral   シーテッドプレス（三角筋前部・三角筋中部）
- seated_press__triceps_brachii                    シーテッドプレス（上腕三頭筋）
+ seated_press                                     シーテッドプレス
+ seated_triceps_press                             シーテッドトライセプスプレス
```

`reverse bench press` も同じ形で解けた。
ADR 0007 の決定は変えない。接尾辞は依然として上流の割れを示す印だが、
**接尾辞が付いていたら、まず正規化で落としすぎていないかを疑う。**

## 影響

- id と日本語名が 7 件変わる。id は主キーなので、この判断を覆すと再び変わる
- 接尾辞が付くレコードが 4 組減り、M5 の重みレビューで見る対象が減る
- 落とす語を増減させると同じ規模の id 変更が起きる。落とす語の追加は慎重に行う
