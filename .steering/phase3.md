# Phase 3: 自動化 — ステアリング

> **ステータス**: 未着手
> **ブランチ**: `feature/phase3-automation`（予定）
> **前提**: Phase 2（安定化）完了後に着手

## ゴール

毎朝9時（JST）に自動でSlack投稿が行われる状態を構築し、1週間の本番検証で安定稼働を確認する。

## スコープ

### 実装タスク

#### GitHub Actions
- [ ] `.github/workflows/daily-post.yml` 作成（cron: `0 0 * * *` UTC = JST 09:00）
- [ ] GitHub Secretsに `ANTHROPIC_API_KEY`, `SLACK_WEBHOOK_URL`, `SLACK_CHANNEL` を登録
- [ ] ワークフローの手動実行（`workflow_dispatch`）対応

#### CI/CD
- [ ] PR時の自動コードレビュー（`/code-review` をGitHub Actionsで実行）
- [ ] PR時のテスト・ビルド自動実行

#### Dockerfile本番化
- [ ] 非rootユーザーでのコンテナ実行
- [ ] 本番用ビルド最適化（不要なdevDependencies除外）

#### 本番検証
- [ ] 1週間の自動投稿を確認（月〜金の5回）
- [ ] エラー通知の動作確認（意図的にAPIキーを無効化してテスト）
- [ ] dedup動作確認（同日2回実行で重複なし）

### スコープ外（将来検討）
- 「もっと見る」Webビュー生成（GitHub Pages）
- Slackコマンド対応（双方向通信）
- ニュースのパーソナライズ

## 完了条件

- [ ] GitHub Actions cronで毎朝9時に自動投稿される
- [ ] 1週間の本番稼働で障害なし
- [ ] PR作成時にテスト・ビルド・コードレビューが自動実行される
- [ ] `develop` → `main` へのマージが完了し、本番ブランチが稼働状態

## 技術的な判断事項

| 項目 | 方針 |
|---|---|
| cron実行環境 | GitHub Actions（無料枠: 月2,000分） |
| Secrets管理 | GitHub Secrets |
| 自動コードレビュー | GitHub ActionsからClaude Code `/code-review` を実行 |

## 参照

- [docs/architecture.md](../docs/architecture.md) — デプロイ方針
- [docs/development-guidelines.md](../docs/development-guidelines.md) — GitHub Actions設定例
- [.steering/phase2.md](phase2.md) — Phase 2 完了が前提
