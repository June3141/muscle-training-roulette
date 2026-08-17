---
title: "[M6] Cloudflare Pages にデプロイする"
labels: infra
milestone: M6
---
design.md §9。M6 の完了条件は「公開 URL がある」。

## 採用: Cloudflare Pages（無料）

| 項目 | 無料枠 |
|---|---|
| 帯域 | 従量制限なし（フェアユース） |
| ビルド | 500回/月、タイムアウト20分 |
| ファイル数 | 20,000（1ファイル最大 25 MiB） |

完全静的サイトなのでこの枠に一切触れない。日本国内にも PoP がある。

## やること

- [ ] Cloudflare のプロジェクトを作り、GitHub リポジトリと連携する
- [ ] ビルドコマンド `pnpm run build` / 出力ディレクトリ `apps/web/dist` を設定する
- [ ] `*.pages.dev` の URL を README に載せる

独自ドメインを取らなければ **完全に 0 円**。ドメインは検証が終わってからで十分。

## 採らなかった選択肢

- **GitHub Pages** — 帯域が月100GB程度、CDN が弱い
- **Vercel Hobby** — 商用利用が規約で禁止。将来プロダクト化するなら最初から避ける
- **Netlify** — 悪くないが Cloudflare の上位互換にはならない
