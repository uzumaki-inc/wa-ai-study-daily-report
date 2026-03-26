# CLAUDE.md — AI学習日報 Slack Bot

## プロジェクト概要

毎朝9時（JST）にSlackへAIニュースの要約を自動投稿するSlackボットサービス。
RSSフィードから最新のAI関連ニュースを収集し、Claude APIで要約して投稿する。
コードはGitHubで公開・管理し、GitHub Actionsによるcronでデプロイする予定。

## アーキテクチャ概要

```
RSS Feeds → Fetcher → Summarizer (Claude API) → Slack Poster
                ↑
           Scheduler (cron: 毎朝9:00 JST)
```

### コンポーネント構成

| コンポーネント | 役割 |
|---|---|
| `src/fetcher/` | RSSフィードの取得・パース |
| `src/summarizer/` | Claude APIによるニュース要約 |
| `src/poster/` | Slack APIへの投稿 |
| `src/scheduler/` | cronスケジューラー |
| `src/config/` | 設定管理（RSS URL、Slackチャンネル等） |

## 技術スタック

> 詳細は `docs/steering.md` を参照。

### 確定済み

- **Node.js + TypeScript** — 言語 / ランタイム
- **Slack Incoming Webhooks** — Slack投稿
- **GitHub Actions (cron)** — デプロイ・スケジューリング
- **Claude API (Anthropic)** — ニュース要約
- **RSSフィード** — AI関連ニュースの収集元

### 主要ライブラリ（想定）

- `@anthropic-ai/sdk` — Claude API
- `@slack/webhook` — Slack Incoming Webhooks
- `rss-parser` — RSS取得・パース

## ⚠️ セキュリティ（公開リポジトリ）

> **このリポジトリはGitHubで公開される。機密情報の漏洩に注意。**

- Slack Webhook URL・チャンネル名・ワークスペース名を **絶対にコードやドキュメントに書かない**
- APIキー・個人名・社内URLも同様
- すべての機密値は **環境変数** (`.env` / GitHub Secrets) で管理する
- 詳細は `docs/steering.md` のセキュリティ方針を参照

## ディレクトリ構成（想定）

```
.
├── CLAUDE.md               # このファイル
├── docs/
│   ├── architecture.md     # 永続化ドキュメント（システム設計）
│   └── steering.md         # ステアリングドキュメント（技術選定・方針）
├── src/
│   ├── config/
│   │   └── index.ts        # 設定管理
│   ├── fetcher/
│   │   └── rss.ts          # RSS取得
│   ├── summarizer/
│   │   └── claude.ts       # Claude API要約・カテゴリ分類
│   ├── poster/
│   │   └── slack.ts        # Slack投稿
│   ├── web/
│   │   └── generator.ts    # 「もっと見る」Webビュー生成
│   ├── scheduler/
│   │   └── cron.ts         # cronスケジューラー
│   └── index.ts            # エントリーポイント
├── docs/
│   └── daily/              # 生成されたWebビュー（GitHub Pages）
│       └── {YYYY-MM-DD}/
│           └── index.html
├── .env.example            # 環境変数テンプレート
├── package.json
└── tsconfig.json
```

## 環境変数

```env
# Slack
SLACK_WEBHOOK_URL=          # Incoming Webhook URL
SLACK_CHANNEL=              # 投稿先チャンネル名（例: #your-channel）

# Anthropic
ANTHROPIC_API_KEY=          # Claude API Key

# RSS設定（カンマ区切りで複数指定可能）
RSS_FEED_URLS=https://techcrunch.com/feed/,https://venturebeat.com/feed/

# スケジュール
CRON_SCHEDULE=0 9 * * *     # 毎朝9時（JST）
TZ=Asia/Tokyo
```

## 開発コマンド

```bash
# 依存関係インストール
npm install

# 開発モードで起動
npm run dev

# ビルド
npm run build

# 本番起動
npm start

# 手動で即時実行（テスト用）
npm run post:now

# テスト
npm test
```

## Slack投稿フォーマット（確定）

5つのカテゴリ × 各2件をSlackに投稿し、各カテゴリに「もっと見る（10件）」リンクを付与。
リンク先はGitHub Pagesにホストした静的HTMLページ。

| カテゴリ | 内容 | ソース |
|---|---|---|
| 🔥 Xで話題 | SNSでバズっているAIトピック | 英語・日本語 |
| 🟠 Anthropic | Anthropic社のニュース | 英語・日本語 |
| 🧠 モデル・技術 | 新モデル・技術ブレイクスルー | 英語・日本語 |
| 📝 ブログ記事 | 技術ブログ記事 | **日本語のみ** |
| 💬 その他話題のニュース | 上記以外のAI関連ニュース | 英語・日本語 |

英語記事には「🇯🇵 日本語で読む」（Google翻訳経由）リンクを自動付与する。

## 重要な設計ルール

1. **環境変数で設定を管理** — APIキー・チャンネル名・RSSのURLはすべて `.env` に記載、コードにハードコードしない
2. **冪等性を保つ** — 同じニュースを重複投稿しないよう、投稿済みの記事URLを記録する
3. **エラーハンドリング** — RSS取得失敗・API呼び出し失敗時はログを残してSlackにエラー通知する
4. **要約品質** — Claude APIへのプロンプトは `docs/architecture.md` に定義・管理する
5. **セキュリティ** — 公開リポジトリのため、Slack URL・チャンネル名・APIキー・個人名を絶対にコードやドキュメントに書かない

## 参照ドキュメント

- [システム設計・データフロー](docs/architecture.md)
- [技術選定・開発方針](docs/steering.md)
