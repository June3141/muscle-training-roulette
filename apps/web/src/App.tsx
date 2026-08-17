import { MUSCLE_GROUPS, MUSCLE_IDS, MUSCLES } from "@mtr/data";

/**
 * M6 までのプレースホルダ。
 *
 * 実際の UI（部位選択 → 種目リスト → カバレッジ可視化）は選択エンジンが固まってから作る。
 * design.md §10:「M3 まではフロントエンドを書かない」
 */
export function App() {
  return (
    <main>
      <h1>トレーニング種目提案</h1>
      <p>
        部位を選ぶと、その部位をカバーする種目セットを提案します。
        記録・保存・ログインはありません。
      </p>
      <p>
        <strong>まだ動きません。</strong> 現在は筋肉タキソノミーと選択エンジンを先に作っています。
      </p>

      <h2>筋肉タキソノミー（{MUSCLE_IDS.length} 分類）</h2>
      {Object.entries(MUSCLE_GROUPS).map(([group, label]) => (
        <section key={group}>
          <h3>{label}</h3>
          <ul>
            {MUSCLE_IDS.filter((id) => MUSCLES[id].group === group).map((id) => (
              <li key={id}>
                {MUSCLES[id].ja} <code>{id}</code>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </main>
  );
}
