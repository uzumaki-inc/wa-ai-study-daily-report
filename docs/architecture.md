# architecture.md — システム設計ドキュメント（永続化ドキュメント）

> **このドキュメントの目的**
> システムの構造・データフロー・重要な設計判断を記録する永続化ドキュメント。
> 変更が生じた場合は必ずここを更新する。

---

## システム全体図

```
┌─────────────────────────────────────────────────────────────┐
│                GitHub Actions (cron)                         │
│              月〜金 09:00 JST 発火                            │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│              Step 1: prepare（npm run prepare:news）          │
│  ・RSS Fetcher: 複数フィードを並列取得                         │
│  ・Dedup: 投稿済みURL照合 → 新着のみ抽出（上限50件）            │
│  ・Summarizer: Claude APIで5カテゴリ分類                       │
│  ・Web Generator: 静的HTML生成（もっと見る）                    │
│  ・結果を .slack-pending.json に保存                           │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│              Step 2: deploy                                  │
│  ・docs/daily/{YYYY-MM-DD}/index.html を git push             │
│  ・GitHub Pages に自動配信                                    │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│              Step 3: post（npm run post:slack）               │
│  ・.slack-pending.json からテキスト読み込み                     │
│  ・Incoming Webhook でSlackに投稿                             │
│  ・投稿成功後、記事URLをdedup storeに記録                       │
└─────────────────────────────────────────────────────────────┘
```

**ローカル実行**: `npm run post:now`（または `docker compose run --rm app`）で Step 1〜3 を一括実行。

---

## データフロー詳細

### 1. RSS取得

**入力**: 環境変数 `RSS_FEED_URLS`（カンマ区切り）またはデフォルトフィード10件

**処理**:
1. 各RSSフィードを `Promise.allSettled` で並列取得（1件失敗しても続行）
2. `dedup_store.json` に記録済みのURLと照合し、新着のみ抽出
3. 公開日時でソート（新しい順）
4. `MAX_ARTICLES_TOTAL`（デフォルト50件）で上限制限

**出力**: `Article[]`

```typescript
type Article = {
  title: string;
  url: string;
  summary: string;      // RSSのdescriptionフィールド（HTMLタグ除去、500文字制限）
  publishedAt: Date;
  source: string;        // フィードのホスト名
  lang: 'en' | 'ja';
  category?: Category;
};

type Category = 'x_trending' | 'anthropic' | 'model_tech' | 'blog_ja' | 'other';
```

---

### 2. 要約（Claude API）

**入力**: `Article[]`
**使用モデル**: `claude-sonnet-4-6`（環境変数 `ANTHROPIC_MODEL` で変更可）
**リトライ**: 指数バックオフ、最大3回

**プロンプト出力**: 2系統

#### 出力1: Slack投稿テキスト（各カテゴリ上位2件）

```
📰 *今日のAIニュース*
{YYYY-MM-DD}（{曜日}）

{カテゴリ名}
• {記事タイトル — 日本語（短く簡潔に）}
  <{記事URL}|{ソースドメイン名}> {英語記事の場合: ｜ <{Google翻訳URL}|日本語で読む>}

＋ <{もっと見るURL}#{カテゴリキー}|もっと見る>
```

#### 出力2: 全記事JSON（各カテゴリ最大10件）

```json
{
  "x_trending": [{"title": "...", "url": "...", "source": "...", "lang": "en", "summary": "2〜3文の要約"}],
  "anthropic": [...],
  "model_tech": [...],
  "blog_ja": [...],
  "other": [...]
}
```

**カテゴリ定義**:

| カテゴリ | キー | 内容 | ソース制限 |
|---|---|---|---|
| 🔥 Xで話題 | `x_trending` | SNS（特にX）でバズっているAI関連トピック | なし |
| 🟠 Anthropic | `anthropic` | Anthropic社に関するニュース | なし |
| 🧠 モデル・技術 | `model_tech` | 新モデルリリース、技術的ブレイクスルー | なし |
| 📝 ブログ記事 | `blog_ja` | 技術ブログ記事（はてぶ・Zenn・note等） | **日本語ソースのみ** |
| 💬 その他話題のニュース | `other` | 上記に分類されないAI関連ニュース | なし |

**入力の分離**:
- Claude APIには**ニュース記事リスト**と**ブログ記事リスト**を分離して渡す
- ニュース記事: 🔥 Xで話題・🟠 Anthropic・🧠 モデル・技術・💬 その他の4カテゴリに分類
- ブログ記事: コード側で事前に切り出し済み（はてぶ6件・Zenn4件・note5件）をそのままblog_jaカテゴリに使用

**選定基準**:
- 各カテゴリ内でインパクトの大きい順に並べる
- 記事タイトルは日本語に翻訳する（英語のままにしない）
- Slack投稿テキストには要約は不要。タイトルとリンクのみ
- 全記事JSONには各記事に2〜3文の日本語要約（summary）を必ず含める
- タイトルは短く簡潔に（1行に収まる長さ）
- ブログ記事カテゴリはブログ記事リストからのみ選定（ニュース記事を混ぜない）
- 該当する記事がないカテゴリはスキップ可

---

### 3. Webビュー生成（「もっと見る」ページ）

Claude APIの全記事JSON（各カテゴリ最大10件）から静的HTMLを生成。

**出力先**: `docs/daily/{YYYY-MM-DD}/index.html`

**URL構成**:
```
https://uzumaki-inc.github.io/wa-ai-study-daily-report/daily/{YYYY-MM-DD}/
https://uzumaki-inc.github.io/wa-ai-study-daily-report/daily/{YYYY-MM-DD}/#{カテゴリキー}
```

**HTML仕様**:
- レスポンシブデザイン（max-width: 700px）
- カテゴリごとに `<section id="{カテゴリキー}">` で区切り
- 各記事に要約本文をトグル表示（`<details>` / `<summary>` タグ、デフォルト閉じ）
- 英語記事にはGoogle翻訳リンクを付与
- XSS対策: URLスキーム検証（http/httpsのみ）、HTMLエスケープ

**記事の表示構成**:
```html
<li>
  <a href="{記事URL}">{タイトル}</a>
  <span class="source">{ソースドメイン}</span>
  <details>
    <summary>要約を読む</summary>
    <p>{2〜3文の要約本文}</p>
  </details>
</li>
```

**デプロイ**: GitHub Actionsで `docs/daily/` を `main` にコミット・push → GitHub Pages自動配信

---

### 4. Slack投稿

**投稿仕様**:
- チャンネル: 環境変数 `SLACK_CHANNEL`
- 形式: Slack Block Kit（section + context）
- 投稿ユーザー名: `AI News Bot`
- アイコン: `:newspaper:`
- リトライ: 指数バックオフ、最大3回（最終失敗時はローカルログに保存）

**Block Kit構成**:

```json
[
  {
    "type": "section",
    "text": { "type": "mrkdwn", "text": "{Claude APIが生成したSlackテキスト}" }
  },
  {
    "type": "context",
    "elements": [
      { "type": "mrkdwn", "text": "毎朝9時自動投稿 | Powered by Claude API" }
    ]
  }
]
```

テキストが3000文字を超える場合、改行位置で分割して複数のsectionブロックにする。

---

## 翻訳リンク仕様

英語記事にはGoogle翻訳経由の日本語リンクを自動付与する。

| フィードの `lang` | Slack表示 | Webビュー表示 |
|---|---|---|
| `en` | `<元URL\|ドメイン> ｜ <翻訳URL\|日本語で読む>` | 元URLリンク + 「日本語で読む」リンク |
| `ja` | `<元URL\|ドメイン>` のみ | 元URLリンクのみ |

**翻訳URL生成**: `https://translate.google.com/translate?sl=en&tl=ja&u={元のURL}`

---

## 重複排除（Dedup）設計

**ストア**: `dedup_store.json`（ファイルベース、メモリキャッシュ付き）
**ストアパス**: 環境変数 `DEDUP_STORE_PATH`（デフォルト: `./dedup_store.json`）
**GitHub Actions永続化**: `actions/cache` で実行間の引き継ぎ

**データ構造**:

```json
{
  "posted_urls": [
    { "url": "https://techcrunch.com/...", "posted_at": "2026-03-28T00:00:00Z" }
  ]
}
```

**TTL**: 環境変数 `DEDUP_TTL_DAYS`（デフォルト: 30日）。古いエントリは自動削除。

---

## エラーハンドリング方針

| エラー種別 | 対応 |
|---|---|
| RSS取得失敗（1つ） | スキップして他フィードで続行、ログ記録 |
| RSS取得全失敗 | Slackにエラー通知して終了 |
| Claude API失敗 | リトライ3回（指数バックオフ）→ 失敗時はSlackにエラー通知 |
| Slack投稿失敗 | リトライ3回 → 失敗時はローカルログに保存 |
| 任意のエラー | `process.env.SLACK_WEBHOOK_URL` 経由でSlackにエラー通知（loadConfig非依存） |

---

## 利用するRSSフィード（デフォルト設定）

### 🇺🇸 英語ソース

| メディア | RSS URL | lang |
|---|---|---|
| TechCrunch AI | `https://techcrunch.com/category/artificial-intelligence/feed/` | `en` |
| VentureBeat AI | `https://venturebeat.com/category/ai/feed/` | `en` |
| MIT Technology Review | `https://www.technologyreview.com/feed/` | `en` |
| The Verge AI | `https://www.theverge.com/ai-artificial-intelligence/rss/index.xml` | `en` |
| Wired AI | `https://www.wired.com/feed/tag/ai/latest/rss` | `en` |

### 🇯🇵 日本語ソース（ニュース）

| メディア | RSS URL | lang |
|---|---|---|
| ITmedia AI+ | `https://rss.itmedia.co.jp/rss/2.0/aiplus.xml` | `ja` |
| Publickey | `https://www.publickey1.jp/atom.xml` | `ja` |
| Gigazine | `https://gigazine.net/news/rss_atom/` | `ja` |

### 🇯🇵 日本語ソース（ブログ記事カテゴリ用）

| メディア | 件数目安 | RSS URL | category | フィルタ |
|---|---|---|---|---|
| はてなブックマーク IT人気エントリ | 6件 | `https://b.hatena.ne.jp/hotentry/it.rss` | `blog_hatena` | AIキーワードフィルタ |
| Zenn AI記事 | 4件 | `https://zenn.dev/topics/ai/feed` | `blog_zenn` | なし（AI特化フィード） |
| note | 5件 | `https://note.com/rss` | `blog_note` | AIキーワードフィルタ |

**ブログ記事の事前フィルタリング（`src/utils/blog-filter.ts`）**:
- はてぶ・noteはAIキーワード（ai, LLM, Claude, プロンプト等）でフィルタリング後、件数制限を適用
- Zennは「ai」トピックのフィードなのでフィルタリング不要
- コード側で件数を保証し、Claude APIの裁量に依存しない

> フィードURLと言語設定は環境変数 `RSS_FEED_URLS` で上書き可能（`URL|lang` 形式、カンマ区切り）。

---

## 変更履歴

| 日付 | 変更内容 | 担当 |
|---|---|---|
| 2026-03-26 | 初版作成 | Claude (Cowork) |
| 2026-03-26 | 日本語RSSソース追加、翻訳リンク仕様追加 | Claude (Cowork) |
| 2026-03-26 | 5カテゴリ分類プロンプト確定、Webビュー（もっと見る）設計追加 | Claude (Cowork) |
| 2026-03-28 | 現行コードを正としてドキュメント全面更新。3ステップ処理順序、Block Kit構成、dedup設計、エラーハンドリングを実装に合わせて修正 | Claude (Cowork) |
| 2026-03-28 | Phase 4仕様追加: ブログRSSソース変更（はてぶ・Zenn・note）、Webビューにトグル付き要約本文追加、全記事JSONにsummaryフィールド追加 | Claude (Cowork) |
| 2026-03-28 | Phase 4実装反映: ブログ記事の事前フィルタリング（blog-filter.ts）、ニュース/ブログ分離してClaude APIに渡す設計、max_tokens 16384、はてぶAIキーワードフィルタ追加 | Claude (Cowork) |
