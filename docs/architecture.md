# architecture.md — システム設計ドキュメント（永続化ドキュメント）

> **このドキュメントの目的**
> システムの構造・データフロー・重要な設計判断を記録する永続化ドキュメント。
> 変更が生じた場合は必ずここを更新する。

---

## システム全体図

```
┌─────────────────────────────────────────────────────────────┐
│                     Scheduler (cron)                        │
│                   毎朝 09:00 JST 発火                        │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                   RSS Fetcher                               │
│  ・複数のRSSフィードURLから記事を取得                           │
│  ・取得済み記事URL（dedup store）と照合し、新着のみ抽出          │
│  ・記事タイトル・URL・本文スニペット・公開日時を構造化            │
└────────────────────────┬────────────────────────────────────┘
                         │ 新着記事リスト
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                   Summarizer (Claude API)                   │
│  ・記事リストをClaude APIに渡し、日本語で要約                   │
│  ・プロンプトテンプレートで出力形式を統一                        │
│  ・使用モデル: claude-sonnet-4-6（設定で変更可）                │
└────────────────────────┬────────────────────────────────────┘
                         │ 要約テキスト（Slack Block Kit形式）
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                   Slack Poster                              │
│  ・Incoming Webhookでチャンネルに投稿                          │
│  ・投稿成功後、記事URLをdedup storeに記録                       │
└─────────────────────────────────────────────────────────────┘
```

---

## データフロー詳細

### 1. RSS取得フェーズ

**入力**: 環境変数 `RSS_FEED_URLS`（カンマ区切りのURL群）

**処理**:
1. 各RSSフィードを並列取得
2. `dedup_store.json`（または軽量DB）に記録済みのURLと照合
3. 新着記事のみ抽出（最大件数は設定で制御、デフォルト10件）
4. 公開日時でソート（新しい順）

**出力**: `Article[]`

```typescript
type Article = {
  title: string;
  url: string;
  summary: string;      // RSSのdescriptionフィールド
  publishedAt: Date;
  source: string;       // フィードのホスト名
  lang: 'en' | 'ja';   // ソースフィードの言語
  category?: Category;  // Claude APIが分類
};

type Category =
  | 'x_trending'   // 🔥 Xで話題
  | 'anthropic'    // 🟠 Anthropic
  | 'model_tech'   // 🧠 モデル・技術
  | 'blog_ja'      // 📝 ブログ記事（日本語限定）
  | 'other';       // 💬 その他話題のニュース
```

---

### 2. 要約フェーズ

**入力**: `Article[]`

**プロンプトテンプレート**:

```
あなたはAI・テクノロジー分野の専門ニュースキュレーターです。
以下の記事リストを読んで、5つのカテゴリに分類し、各カテゴリから上位2件を選んで日本語の日報を作成してください。

【カテゴリ（この順序で出力）】
1. 🔥 Xで話題 — SNS（特にX）でバズっているAI関連トピック
2. 🟠 Anthropic — Anthropic社に関するニュース（製品・訴訟・研究）
3. 🧠 モデル・技術 — 新モデルリリース、技術的ブレイクスルー
4. 📝 ブログ記事 — 日本語の技術ブログ記事（Zenn, Qiita等）
5. 💬 その他話題のニュース — 上記に分類されないAI関連の重要ニュース

【出力フォーマット（Slack mrkdwn形式）】
📰 *今日のAIニュース*
{date}（{曜日}）｜ 各カテゴリ厳選 2 件

{カテゴリ名}
• *{記事タイトル — 日本語}*
  {2〜3文の要約。日本語で。}
  🔗 {ソースドメイン名} {英語記事の場合: ｜ 🇯🇵 日本語で読む {Google翻訳URL}}

＋ もっと見る（10件） {カテゴリ詳細ページURL}

（各カテゴリについて繰り返し）

---
毎朝9時自動投稿 ｜ Powered by Claude API

【選定基準】
- 各カテゴリ内で最もインパクトの大きい2件を選ぶ
- 記事タイトルは日本語に翻訳する（英語のままにしない）
- 要約は技術者が読んで価値を感じる内容に絞る
- ブログ記事カテゴリは日本語ソースのみから選定する

【記事リスト】
{articles}
```

**出力**:
1. Slack投稿用テキスト（各カテゴリ上位2件）
2. カテゴリ別全記事リスト（各カテゴリ最大10件 → Webビュー用JSON）

---

### 3. Webビュー生成フェーズ（「もっと見る」ページ）

Claude APIから返された全記事（各カテゴリ最大10件）を静的HTMLとして生成し、
GitHub Pages（または同等のホスティング）にデプロイする。

**URL構成**:
```
https://{username}.github.io/{repo-name}/daily/{YYYY-MM-DD}/
https://{username}.github.io/{repo-name}/daily/{YYYY-MM-DD}/#x_trending
https://{username}.github.io/{repo-name}/daily/{YYYY-MM-DD}/#anthropic
https://{username}.github.io/{repo-name}/daily/{YYYY-MM-DD}/#model_tech
https://{username}.github.io/{repo-name}/daily/{YYYY-MM-DD}/#blog_ja
https://{username}.github.io/{repo-name}/daily/{YYYY-MM-DD}/#other
```

**生成フロー**:
1. Claude APIのレスポンスから全記事のJSONを取得
2. HTMLテンプレートにJSONを埋め込み、静的HTMLを `docs/daily/{YYYY-MM-DD}/index.html` に生成
3. GitHub Actions の push で GitHub Pages に自動デプロイ

**Slack上の「もっと見る」リンク**:
```
＋ もっと見る（10件） → https://{pages-url}/daily/2026-03-26/#x_trending
```

---

### 4. Slack投稿フェーズ

**入力**: 整形済みテキスト

**投稿仕様**:
- チャンネル: 環境変数 `SLACK_CHANNEL`
- 形式: Slack Block Kit（リッチフォーマット）
- 投稿ユーザー名: `AI News Bot`
- アイコン: `:newspaper:`

**Block Kit構成**:

```json
[
  {
    "type": "header",
    "text": { "type": "plain_text", "text": "📰 今日のAIニュース" }
  },
  {
    "type": "section",
    "text": { "type": "mrkdwn", "text": "{要約テキスト}" }
  },
  {
    "type": "context",
    "elements": [
      { "type": "mrkdwn", "text": "毎朝9時自動投稿 | Powered by Claude API" }
    ]
  }
]
```

---

## 重複排除（Dedup）設計

投稿済み記事の重複投稿を防ぐためのストア。

**実装候補**:
- `dedup_store.json`（ローカルファイル、シンプル）
- SQLite（軽量DB、永続性が高い）

**データ構造**:

```json
{
  "posted_urls": [
    "https://techcrunch.com/...",
    "https://venturebeat.com/..."
  ],
  "last_run": "2026-03-26T00:00:00Z"
}
```

**TTL（保持期間）**: 30日間（古いURLは削除して肥大化防止）

---

## エラーハンドリング方針

| エラー種別 | 対応 |
|---|---|
| RSS取得失敗（1つ） | スキップして他フィードで続行、ログ記録 |
| RSS取得全失敗 | Slackにエラー通知して終了 |
| Claude API失敗 | リトライ3回（指数バックオフ）→失敗時はエラー通知 |
| Slack投稿失敗 | リトライ3回 → 失敗時はローカルログに保存 |

---

## 利用するRSSフィード（初期設定候補）

### 🇺🇸 英語ソース

| メディア | RSS URL | lang |
|---|---|---|
| TechCrunch AI | `https://techcrunch.com/category/artificial-intelligence/feed/` | `en` |
| VentureBeat AI | `https://venturebeat.com/category/ai/feed/` | `en` |
| MIT Technology Review | `https://www.technologyreview.com/feed/` | `en` |
| The Verge AI | `https://www.theverge.com/ai-artificial-intelligence/rss/index.xml` | `en` |
| Wired AI | `https://www.wired.com/feed/tag/ai/latest/rss` | `en` |

### 🇯🇵 日本語ソース

| メディア | RSS URL | lang |
|---|---|---|
| ITmedia AI+ | `https://rss.itmedia.co.jp/rss/2.0/aiplus.xml` | `ja` |
| AINOW | `https://ainow.ai/feed/` | `ja` |
| AI-SCHOLAR | `https://ai-scholar.tech/feed` | `ja` |
| Publickey | `https://www.publickey1.jp/atom.xml` | `ja` |
| Gigazine AI | `https://gigazine.net/news/rss_atom/` | `ja` |

> フィードURLと言語設定は環境変数 `RSS_FEED_URLS` で上書き可能。

---

## 翻訳リンク仕様

英語記事にはGoogle翻訳経由の日本語リンクを自動付与する。

**ルール**:
- フィードの `lang` が `en` の場合 → 元URLに加えて翻訳リンクを付与
- フィードの `lang` が `ja` の場合 → 元URLのみ（翻訳リンクなし）

**翻訳URL生成**:
```
https://translate.google.com/translate?sl=en&tl=ja&u={元のURL}
```

**Slack表示例**:
```
🔹 OpenAI announces GPT-5 ...
   要約テキスト ...
   🔗 techcrunch.com ｜ 🇯🇵 日本語で読む

🔹 ITmedia: 国内AI市場が過去最高に ...
   要約テキスト ...
   🔗 itmedia.co.jp
```

---

## 変更履歴

| 日付 | 変更内容 | 担当 |
|---|---|---|
| 2026-03-26 | 初版作成 | Claude (Cowork) |
| 2026-03-26 | 日本語RSSソース追加、翻訳リンク仕様追加 | Claude (Cowork) |
| 2026-03-26 | 5カテゴリ分類プロンプト確定、Webビュー（もっと見る）設計追加 | Claude (Cowork) |
