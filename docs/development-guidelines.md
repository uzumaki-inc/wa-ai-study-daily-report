# steering.md — ステアリングドキュメント（開発方針・技術選定）

> **このドキュメントの目的**
> プロダクトの方向性、技術選定の理由、未解決の判断事項を記録する。
> 「なぜこう作るか」の意思決定ログとして機能させる。

---

## プロダクト方針

### ゴール

毎朝SlackにAIニュースの日本語要約が届くことで、
チームメンバーが業務前にAI最新動向を効率的にキャッチアップできる状態を作る。

### スコープ

**In scope（やること）**
- RSSフィードからAI関連ニュースを自動収集
- Claude APIで日本語要約を生成
- 毎朝9時にSlack指定チャンネルへ自動投稿
- GitHubでコードを公開・管理

**Out of scope（やらないこと）**
- ユーザーからのSlackコマンド受付（ボット対話機能）
- Webダッシュボードやバックオフィス画面
- ニュースのパーソナライズ（ユーザーごとの設定）
- 有料ニュースソースのスクレイピング

---

## 技術選定

### ✅ 確定済み技術選定

| 項目 | 決定 | 理由 |
|---|---|---|
| 言語 / ランタイム | **Node.js + TypeScript** | Slack SDK親和性、型安全、Anthropic SDK最適化 |
| Slack連携方式 | **Incoming Webhooks** | MVP向けにシンプル。双方向通信不要 |
| デプロイ先 | **GitHub Actions (cron)** | 無料枠、サーバー管理不要、リポジトリと一体管理 |
| Dedup ストレージ | 未定（Phase 2で決定） | SQLite推奨 |

### 技術選定の判断基準

1. **シンプルさ優先** — 最初のMVPは複雑な構成を避け、動くものを最速で作る
2. **メンテナンス性** — 本番運用後に一人でも変更できる構成にする
3. **コスト最小化** — 無料枠で動く構成を基本とする

### Node.js + TypeScript を推奨する理由

- `@slack/webhook` と `@slack/bolt` パッケージが公式サポートされており実績が豊富
- `rss-parser` ライブラリがシンプルで使いやすい
- 型安全なコードが書きやすく、後から読み返しやすい
- Anthropic公式の `@anthropic-ai/sdk` がTypeScriptに最適化されている

---

## セキュリティ方針（公開リポジトリ）

> **⚠️ このリポジトリはGitHub上で公開される。**
> 以下のルールを厳守し、機密情報の漏洩を防ぐこと。

### 絶対にコードやドキュメントに書いてはいけないもの

- Slack Webhook URL
- Slack チャンネル名・チャンネルID
- Slack ワークスペース名・ワークスペースID
- Anthropic API Key
- 個人名・メールアドレス・社内URL
- その他、組織を特定できる情報

### 機密情報の管理ルール

1. **すべての機密値は環境変数経由で注入する** — `.env`（ローカル）or GitHub Secrets（CI）
2. **`.env` は必ず `.gitignore` に含める** — `.env.example` はキー名のみ記載、値は空にする
3. **ドキュメント内の例示にはプレースホルダーを使う** — `#ai-news` ではなく `#your-channel` のように書く
4. **PRレビュー時にはシークレット漏洩を必ずチェック** — `git diff` でハードコードされた値がないか確認

---

## デプロイ方針

### 確定: GitHub Actions（cron trigger）

```yaml
# .github/workflows/daily-post.yml
on:
  schedule:
    - cron: '0 0 * * *'  # UTC 00:00 = JST 09:00
```

**メリット**
- 無料枠で動く（月2,000分のActionが無料）
- サーバー管理不要
- GitHubにコードを上げる予定なので自然な選択

**デメリット**
- 実行時間に数分の誤差が生じることがある
- secrets（APIキー）はGitHub Secrets で管理

---

## GitHubリポジトリ方針

### リポジトリ構成

```
github.com/{username}/{repo-name}
├── CLAUDE.md
├── README.md        # セットアップ手順・設定方法
├── docs/
│   ├── architecture.md
│   └── steering.md
├── src/
├── .github/
│   └── workflows/
│       └── daily-post.yml
├── .env.example     # ← .envは.gitignoreに入れること
└── .gitignore
```

### .gitignore に必ず含めるもの

```
.env
node_modules/
dist/
dedup_store.json    # 投稿済みURL記録（ローカルステート）
*.log
```

### GitHub Secrets（本番運用時に設定）

| Secret名 | 内容 |
|---|---|
| `ANTHROPIC_API_KEY` | Claude API Key |
| `SLACK_WEBHOOK_URL` | Slack Incoming Webhook URL |
| `SLACK_CHANNEL` | 投稿先チャンネル（例: `#your-channel`） |

---

## 開発フェーズ計画

各フェーズの詳細（スコープ・完了条件・技術判断）は `.steering/` 配下を参照。

| フェーズ | ステアリング | ステータス |
|---|---|---|
| Phase 1: MVP | [.steering/phase1.md](../.steering/phase1.md) | 完了 |
| Phase 2: 安定化 | [.steering/phase2.md](../.steering/phase2.md) | 完了 |
| Phase 3: 自動化 | [.steering/phase3.md](../.steering/phase3.md) | 完了 |
| Phase 4: 改善 | [.steering/phase4.md](../.steering/phase4.md) | 未着手 |

---

## 未解決の判断事項（ADR待ち）

| # | 判断事項 | 期限 | メモ |
|---|---|---|---|
| 1 | ~~技術スタック~~ | ~~開発開始前~~ | ✅ Node.js + TypeScript に確定 |
| 2 | ~~Slack連携方式~~ | ~~開発開始前~~ | ✅ Incoming Webhooks に確定 |
| 3 | ~~デプロイ先~~ | ~~Phase 3前~~ | ✅ GitHub Actions に確定 |
| 4 | Dedupストレージの確定 | Phase 2前 | SQLite推奨 |
| 5 | ~~Slack投稿フォーマットの最終確定~~ | ~~Phase 1前~~ | ✅ 5カテゴリ×2件 +「もっと見る」Webビュー構成に確定 |
| 6 | 「もっと見る」Webビューのホスティング先確定 | Phase 1 | GitHub Pages推奨 |

---

## 変更履歴

| 日付 | 変更内容 | 担当 |
|---|---|---|
| 2026-03-26 | 初版作成。GitHub公開方針を追記 | Claude (Cowork) |
| 2026-03-26 | 技術選定確定（Node.js+TS / Webhooks / GitHub Actions）。セキュリティ方針追加 | Claude (Cowork) |
| 2026-03-26 | 投稿フォーマット確定（5カテゴリ×2件+もっと見るWebビュー）、ブログ記事は日本語限定 | Claude (Cowork) |
