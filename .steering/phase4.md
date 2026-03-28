# Phase 4: 改善 — ステアリング

> **ステータス**: 実装完了・本番稼働中（2026-03-28）
> **ブランチ**: `feature/phase4-improvements` → `develop` → `main` にマージ済み
> **前提**: Phase 3（自動化）完了後に着手

## ゴール

ブログ記事の収集ソースを刷新し、Webビューに要約本文を追加する。
コードレビュー指摘の改善も行う。

## スコープ

### RSSフィード変更（ブログ記事カテゴリ）

ブログ記事カテゴリのソースを以下に変更。コード側で件数を保証する設計。

| ソース | 件数目安 | RSS URL | フィルタ |
|---|---|---|---|
| はてぶIT人気エントリ | 6件 | `https://b.hatena.ne.jp/hotentry/it.rss` | AIキーワードフィルタ |
| Zenn AI記事 | 4件 | `https://zenn.dev/topics/ai/feed` | なし |
| note | 5件 | `https://note.com/rss` | AIキーワードフィルタ |

#### 実装タスク
- [x] はてぶIT人気エントリのRSSフィードURL設定
- [x] Zenn AI記事のRSSフィードURL設定
- [x] note全体RSSを使用し、AIキーワードフィルタリングを実装
- [x] `src/config/index.ts` にFeedCategory追加・デフォルトフィード更新
- [x] `src/utils/blog-filter.ts` 新規作成（事前切り出し+AIフィルタ）
- [x] Claude APIプロンプト修正（ニュース/ブログを分離して渡す）
- [x] はてぶもAIキーワードフィルタリングを適用
- [x] `docs/architecture.md` のRSSフィード一覧を更新

### Webビュー改善（「もっと見る」ページ）

- [x] Claude APIプロンプト修正（全記事JSONに `summary` フィールドを追加）
- [x] `CategoryArticle` 型に `summary` フィールドを追加
- [x] `src/web/generator.ts` にトグル（details/summary）追加
- [x] CSSスタイル調整

### コードレビュー指摘対応

- [x] `Category` 型と `Article.category` の削除（未使用コード）
- [x] `escapeHtml` / `safeUrl` / `parseResponse` / `extractJson` のexport + ユニットテスト追加
- [x] `todayWithDayJST` の曜日をIntl.DateTimeFormatでJST固定に修正
- [x] `parseFeedsのlangバリデーション追加
- [x] ドライランモード追加（`npm run dry-run`）
- [ ] `loadConfig` のSlack/Anthropic分離（将来改善）

### 不具合修正

- [x] prepareモードでNode.jsプロセスが終了しない問題（process.exit(0)追加）
- [x] ARTICLES_JSONパース失敗（max_tokens 8192→16384、プロンプトに両タグ出力必須指示追加）
- [x] パース失敗時のデバッグログ追加（レスポンス末尾300文字を出力）

### Phase 3 からの持ち越し

#### CI/CD
- [ ] PR時の自動コードレビュー（`/code-review` をGitHub Actionsで実行）
- [ ] ESLint導入

#### 本番検証
- [ ] 1週間の自動投稿を確認（月〜金の5回）
- [ ] エラー通知の動作確認
- [ ] dedup動作確認（同日2回実行で重複なし）

### スコープ外（将来検討）
- Slackコマンド対応（双方向通信）
- ニュースのパーソナライズ
- `stop_reason` チェック追加（max_tokens到達検知）
- `max_tokens` の環境変数化

## 成果物

| ファイル | 内容 |
|---|---|
| `src/config/index.ts` | FeedCategory追加・ブログRSSフィード設定 |
| `src/utils/blog-filter.ts` | ブログ記事の事前切り出し・AIキーワードフィルタ |
| `src/summarizer/claude.ts` | プロンプト分離（ニュース/ブログ）・summary追加・max_tokens増加 |
| `src/web/generator.ts` | details/summaryトグル・要約表示 |
| `src/utils/date.ts` | 曜日をIntl.DateTimeFormatでJST固定 |
| `src/types.ts` | Category型削除・feedCategory追加 |
| `src/__tests__/escapeHtml.test.ts` | escapeHtml/safeUrlのユニットテスト |
| `src/__tests__/parseResponse.test.ts` | parseResponse/extractJsonのユニットテスト |

## 参照

- [docs/architecture.md](../docs/architecture.md) — RSSフィード一覧・Webビュー仕様・プロンプト
- [.steering/phase3.md](phase3.md) — Phase 3 完了記録
