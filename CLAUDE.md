# CLAUDE.md — AI学習日報 Slack Bot

毎朝9時（JST）にSlackへAIニュースの要約を自動投稿するSlackボット。
RSS → Claude API要約 → Slack投稿。GitHub Actions cronで自動実行。

## セキュリティ（公開リポジトリ）

**機密情報（Webhook URL・チャンネル名・APIキー・個人名）は絶対にコード/ドキュメントに書かない。**
すべて環境変数（`.env` / GitHub Secrets）で管理する。

## 開発コマンド

```bash
# Docker経由（推奨）
docker compose run --rm app       # 手動即時実行（実行後コンテナ削除）
docker compose build app          # Dockerイメージをビルド

# ローカル直接実行
npm install          # 依存関係インストール
npm run dev          # 開発モード
npm run build        # ビルド
npm start            # 本番起動
npm run post:now     # 手動即時実行（テスト用）
npm test             # テスト
```

## ドキュメント索引

| ドキュメント | 内容 |
|---|---|
| [docs/product-requirements.md](docs/product-requirements.md) | プロダクト要求定義（機能仕様・投稿フォーマット・環境変数） |
| [docs/architecture.md](docs/architecture.md) | システム設計（データフロー・プロンプト・API仕様） |
| [docs/development-guidelines.md](docs/development-guidelines.md) | 開発ガイドライン（技術選定・セキュリティ・デプロイ方針） |
| [docs/ideas/](docs/ideas/) | アイデア・モック（Slack出力モック等） |

## 作業指示

- 作業単位のステアリングは `.steering/` 配下を参照。
- サブエージェント定義は `.claude/agents/` を参照。
- カスタムコマンドは `.claude/commands/` を参照。
- スキルは `.claude/skills/` を参照。

## 重要な設計ルール

1. 環境変数で設定管理（ハードコード禁止）
2. 冪等性（重複投稿防止）
3. エラー時はログ＋Slack通知
4. プロンプトは `docs/architecture.md` で管理
