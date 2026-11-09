# 活動ダッシュボード

GitHub Pages で公開する、活動状況のダッシュボードです。画面は `index.html`、数字は `data/latest.json` にあります。

## 自動で更新するもの
`.github/workflows/update.yml` が3時間ごとに `scripts/update.mjs` を実行し、`data/latest.json` を更新します。

| 項目 | 取得元 | 必要な Secret |
|---|---|---|
| GitHub | GitHub API | `DASH_GH_TOKEN` |
| Threads | threads-auto-post の `insights_summary.md` | `DASH_GH_TOKEN` |
| Instagram | Windsor.ai の API | `WINDSOR_API_KEY`(なければ前回の値のまま) |

`DASH_GH_TOKEN` は、自分の全リポジトリの Contents を読める個人用アクセストークン(fine-grained)です。

## 手動で更新するもの
note・Amazon アソシエイト・YouTube は `data/latest.json` の該当部分を書き換えます。ログインが必要で公式 API がないためです。
