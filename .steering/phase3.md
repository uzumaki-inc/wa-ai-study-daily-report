# Phase 3: 自動化 — ステアリング

> **ステータス**: 完了（2026-03-28）
> **ブランチ**: `feature/phase3-automation` → `develop` → `main` にマージ済み
> **前提**: Phase 2（安定化）完了後に着手

## ゴール

毎朝9時（JST）に自動でSlack投稿が行われる状態を構築し、1週間の本番検証で安定稼働を確認する。

## スコープ

### 実装タスク

#### GitHub Actions
- [x] `.github/workflows/daily-post.yml` 作成（cron: `0 0 * * 1-5` 月〜金のみ）
- [x] GitHub Secretsに `ANTHROPIC_API_KEY`, `SLACK_WEBHOOK_URL`, `SLACK_CHANNEL` を登録
- [x] ワークフローの手動実行（`workflow_dispatch`）対応
- [x] `dedup_store.json` の永続化（`actions/cache` で実行間の引き継ぎ）
- [x] Webビューデプロイ後にSlack投稿する順序に変更（prepare → deploy → post）

#### CI/CD
- [x] PR時のテスト・ビルド自動実行（`.github/workflows/ci.yml`）

#### Dockerfile本番化
- [x] 非rootユーザーでのコンテナ実行
- [x] マルチステージビルド（本番用devDependencies除外）

#### Phase 2 レビューからの持ち越し
- [x] dedup.tsのユニットテスト追加
- [x] retryテストのfake timer化（`vi.useFakeTimers()`）

#### 「もっと見る」Webビュー
- [x] `src/web/generator.ts` で静的HTML生成（`docs/daily/{YYYY-MM-DD}/index.html`）
- [x] Claude APIのレスポンスから全記事のJSON取得（各カテゴリ最大10件）
- [x] GitHub Pagesでホスティング（`/docs` フォルダ配信）
- [x] Slack投稿に「もっと見る」リンクを追加

#### コードレビュー対応
- [x] XSS修正（URLスキーム検証、シングルクォートエスケープ）
- [x] postモードのエラーハンドラ修正（loadConfigクラッシュ防止）
- [x] prepare/run重複をprepareCore()に抽出
- [x] 日付生成ユーティリティ共通化（todayJST/todayWithDayJST）
- [x] postToSlackのConfig依存排除（SlackConfig型に変更）

## 対応済みの不具合修正

- actions/cacheキーに`run_id`を含めて毎回更新されるよう修正
- ワークフローに`permissions: contents: read/write`を追加
- Deployステップにtimeout-minutes: 2を追加（ハング防止）
- Webビューデプロイ完了後にSlack投稿する順序に修正
- postモードで`ANTHROPIC_API_KEY`不要に修正
- Claude APIのJSON出力パース改善（```json囲み対応）

## 成果物

| ファイル | 内容 |
|---|---|
| `.github/workflows/daily-post.yml` | 毎朝自動投稿（prepare → deploy → post） |
| `.github/workflows/ci.yml` | PR時テスト・ビルド |
| `Dockerfile` | マルチステージビルド・非rootユーザー |
| `src/web/generator.ts` | 静的HTML Webビュー生成 |
| `src/utils/date.ts` | 日付生成ユーティリティ |
| `src/__tests__/dedup.test.ts` | dedupユニットテスト |

## 技術的な判断事項

| 項目 | 方針 |
|---|---|
| cron実行環境 | GitHub Actions（月〜金のみ、無料枠: 月2,000分） |
| Secrets管理 | GitHub Secrets |
| 処理順序 | prepare（要約+HTML生成）→ deploy（git push）→ post（Slack投稿） |
| Webビュー配信 | GitHub Pages（mainブランチ /docs フォルダ） |

## 参照

- [docs/architecture.md](../docs/architecture.md) — デプロイ方針
- [docs/development-guidelines.md](../docs/development-guidelines.md) — GitHub Actions設定例
- [.steering/phase2.md](phase2.md) — Phase 2 完了が前提
- [.steering/phase4.md](phase4.md) — Phase 3 残りタスク + 新規改善
