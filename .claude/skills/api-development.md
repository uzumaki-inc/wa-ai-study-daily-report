# スキル: API開発（Claude API / Slack Webhook）

このプロジェクトでAPI連携コードを書く際に参照するスキルです。

## Claude API（要約処理）

### 基本ルール
- `@anthropic-ai/sdk` を使用する
- モデルは `claude-sonnet-4-6` をデフォルトとし、設定で変更可能にする
- APIキーは環境変数 `ANTHROPIC_API_KEY` から取得する（ハードコード厳禁）
- プロンプトテンプレートは `docs/architecture.md` の「要約フェーズ」セクションに定義されたものを使用する

### エラーハンドリング
- リトライ3回（指数バックオフ）
- 失敗時はSlackにエラー通知
- レート制限エラーは長めの待機後にリトライ

### レスポンス処理
- Claude APIのレスポンスをパースし、5カテゴリに分類された記事リストを抽出する
- Slack投稿用テキスト（各カテゴリ2件）とWebビュー用JSON（各カテゴリ10件）を分離する

## Slack Webhook（投稿処理）

### 基本ルール
- `@slack/webhook` を使用する
- Webhook URLは環境変数 `SLACK_WEBHOOK_URL` から取得する（ハードコード厳禁）
- チャンネル名は環境変数 `SLACK_CHANNEL` から取得する
- Block Kit形式で投稿する（`docs/architecture.md` の「Slack投稿フェーズ」参照）

### エラーハンドリング
- リトライ3回
- 失敗時はローカルログに保存

## RSS取得

### 基本ルール
- `rss-parser` を使用する
- フィードURLは環境変数 `RSS_FEED_URLS` からカンマ区切りで取得する
- 複数フィードは `Promise.all` で並列取得する
- 個別フィードの失敗は他フィードに影響させない

### データ型
- `docs/architecture.md` の `Article` 型定義に従う
- `lang` フィールドでソース言語を区別する
- 英語記事にはGoogle翻訳リンクを自動付与する
