---
title: "[M1] 筋肉タキソノミーを確定する（元データに存在しない分類の扱い）"
labels: taxonomy, decision
milestone: M1
---
`packages/data/src/taxonomy.ts` は **21 分類**（ADR 0005）。
大枠は確定済みなので、この Issue では残った 2 点を決める。

**ADR 0005 で決定済み（この Issue の対象外）**

- 菱形筋 → 僧帽筋中下部に統合。判別材料が 73 件中 5 件しかない
- 首 → 対象外。5 件すべて secondary 参照 0 の孤島
- 腹横筋 → 維持。アンチ伸展系 10 件で判別できる。ただし人体図には描けない

## 論点 1: 元データに存在しない分類

上流の primaryMuscles は 17 分類しかなく、§4.3 が要求する分割の情報を持っていない。
詳細は `docs/data-survey.md`。推定が必要な件数は概ね **250 件強**。

## 論点 2: タキソノミーに存在しない上流の部位

逆に、上流にあって §4.3 にないものがある。

| 上流 | strength での件数 | 扱い |
|---|---|---|
| `neck` | 5 | **未定**。首の種目を捨てるか、`sternocleidomastoid` 等を足すか |
| `forearms` | 21 | 現在は `brachioradialis` のみ。手関節屈伸（リストカール）が写せない |

「捨てる」も選択肢。部位選択 UI に首がなくても困らない。ただし**捨てるなら明示的に捨てる**こと。
マッピングが失敗して黙って落ちるのと区別がつかなくなる。

## 論点 3: ローテーターカフ

三角筋の写像作業で判明した。上流の `shoulders` に**ローテーターカフ種目が 7 件**混ざっている。

- External Rotation / External Rotation with Band / External Rotation with Cable
- Internal Rotation with Band / Cable Internal Rotation
- Dumbbell Scaption
- Reverse Flyes With External Rotation

§4.3 のタキソノミーに棘上筋・棘下筋・小円筋・肩甲下筋がないので写せない。
現在は**判別不能として明示**している（黙って三角筋に寄せない）。

- [ ] `rotator_cuff` を 1 分類として足すか、これらの種目を `selectable: false` にするか決める

## 論点 4: 中臀筋

`abductors` は上流に **2 件**しかない。中臀筋を独立分類として持つ以上、
スクワット・ランジ等の secondary から配分を拾わないと事実上カバー不能になる。

## 完了条件

- [ ] 21 分類を確定、または増減させる
- [ ] 上流 17 分類 → 新タキソノミーの写像表が `docs/` にある（捨てるものも明記）
- [ ] 写像表に漏れがないことをテストで検証している
