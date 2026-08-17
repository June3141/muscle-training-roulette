#!/usr/bin/env bash
#
# GitHub 側の初期セットアップ。ラベル・マイルストーン・Issue・Projects ボードを作る。
#
# 何度実行しても同じ結果になる（既存のものはスキップまたは更新）。
# 追加した Issue 定義を反映したいときは、そのまま再実行してよい。
#
# 使い方:
#   scripts/bootstrap-github.sh <owner>/<repo>
#
set -euo pipefail

REPO="${1:-}"
if [[ -z "$REPO" ]]; then
  echo "使い方: $0 <owner>/<repo>" >&2
  exit 1
fi

OWNER="${REPO%%/*}"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PROJECT_TITLE="トレーニング種目提案サイト"

echo "== 対象リポジトリ: $REPO"

# ---------------------------------------------------------------- ラベル

echo "== ラベル"
jq -c '.[]' "$ROOT/.github/labels.json" | while read -r label; do
  name=$(jq -r '.name' <<<"$label")
  color=$(jq -r '.color' <<<"$label")
  description=$(jq -r '.description' <<<"$label")
  # --force で既存ラベルの色と説明を更新する
  gh label create "$name" --repo "$REPO" --color "$color" --description "$description" --force >/dev/null
  echo "   $name"
done

# ------------------------------------------------------------ マイルストーン

echo "== マイルストーン"
existing_milestones=$(gh api "repos/$REPO/milestones?state=all&per_page=100" --jq '.[].title')
jq -c '.[]' "$ROOT/.github/bootstrap/milestones.json" | while read -r milestone; do
  title=$(jq -r '.title' <<<"$milestone")
  description=$(jq -r '.description' <<<"$milestone")
  if grep -qxF "$title" <<<"$existing_milestones"; then
    echo "   $title (既存)"
    continue
  fi
  gh api "repos/$REPO/milestones" -f title="$title" -f description="$description" >/dev/null
  echo "   $title"
done

# ---------------------------------------------------------------- Issue

# frontmatter から 1 フィールドを取り出す。値の前後のダブルクォートは剥がす。
read_field() {
  awk -v key="$1" '
    NR == 1 && /^---$/ { infm = 1; next }
    infm && /^---$/ { exit }
    infm && index($0, key ": ") == 1 {
      sub("^" key ": ", "")
      gsub(/^"|"$/, "")
      print
      exit
    }
  ' "$2"
}

# 2 つ目の --- 以降を本文として取り出す
read_body() {
  awk 'BEGIN { seen = 0 } /^---$/ && seen < 2 { seen++; next } seen >= 2' "$1"
}

echo "== Issue"
existing_issues=$(gh issue list --repo "$REPO" --state all --limit 200 --json title --jq '.[].title')

for file in "$ROOT"/.github/bootstrap/issues/*.md; do
  title=$(read_field title "$file")
  labels=$(read_field labels "$file")
  milestone=$(read_field milestone "$file")

  if [[ -z "$title" ]]; then
    echo "   ! $(basename "$file"): title が読めないのでスキップ" >&2
    continue
  fi

  if grep -qxF "$title" <<<"$existing_issues"; then
    echo "   $title (既存)"
    continue
  fi

  body_file=$(mktemp)
  read_body "$file" >"$body_file"

  args=(--repo "$REPO" --title "$title" --body-file "$body_file")
  [[ -n "$milestone" ]] && args+=(--milestone "$milestone")
  if [[ -n "$labels" ]]; then
    # "data, taxonomy" → --label data --label taxonomy
    IFS=',' read -ra label_list <<<"$labels"
    for label in "${label_list[@]}"; do
      args+=(--label "$(echo "$label" | xargs)")
    done
  fi

  gh issue create "${args[@]}" >/dev/null
  rm -f "$body_file"
  echo "   $title"
done

# -------------------------------------------------------------- Projects

echo "== Projects"
project_number=$(gh project list --owner "$OWNER" --format json \
  --jq ".projects[] | select(.title == \"$PROJECT_TITLE\") | .number" 2>/dev/null | head -1)

if [[ -z "$project_number" ]]; then
  project_number=$(gh project create --owner "$OWNER" --title "$PROJECT_TITLE" --format json --jq '.number')
  echo "   ボードを作成しました: #$project_number"
else
  echo "   既存のボードを使います: #$project_number"
fi

added=0
while read -r url; do
  [[ -z "$url" ]] && continue
  gh project item-add "$project_number" --owner "$OWNER" --url "$url" >/dev/null 2>&1 && added=$((added + 1))
done < <(gh issue list --repo "$REPO" --state open --limit 200 --json url --jq '.[].url')

echo "   $added 件の Issue をボードに追加しました（既に載っているものは無視）"

echo
echo "完了: https://github.com/$REPO/issues"
