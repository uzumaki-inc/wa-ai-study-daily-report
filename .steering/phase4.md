# Phase 4: 改善 — ステアリング

> **ステータス**: 未着手
> **ブランチ**: `feature/phase4-improvements`（予定）
> **前提**: Phase 3（自動化）完了後に着手

## ゴール

ブログ記事の収集ソースを刷新し、Webビューに要約本文を追加する。
コードレビュー指摘の改善も行う。

## スコープ

### RSSフィード変更（ブログ記事カテゴリ）

現在のブログ記事ソース（ITmedia, AINOW, AI-SCHOLAR, Publickey, Gigazine）を以下に変更する。

| ソース | 件数 | RSS URL |
|---|---|---|
| はてなブックマーク IT人気エントリ（AI記事） | 6件 | 要調査 |
| Zenn AI記事 | 4件 | 要調査 |
| note AI記事 | 5件 | 要調査 |

**注意**: 既存の英語ソース（TechCrunch, VentureBeat等）と日本語ニュースソース（ITmedia, Gigazine等）は維持。ブログ記事カテゴリのソースのみ変更。

#### 実装タスク
- [ ] はてぶIT人気エントリのAI関連RSSフィードURLを調査・設定
- [ ] Zenn AI記事のRSSフィードURLを調査・設定
- [ ] note AI記事のRSSフィードURLを調査・設定
- [ ] `src/config/index.ts` のデフォルトフィード設定を更新
- [ ] Claude APIプロンプトのブログ記事カテゴリ説明を更新（はてぶ・Zenn・note）
- [ ] `docs/architecture.md` のRSSフィード一覧を更新

### Webビュー改善（「もっと見る」ページ）

現在のWebビューはタイトル+リンクのみだが、要約本文を追加する。

**仕様**:
- 各記事にClaude APIが生成した2〜3文の要約本文を表示
- デフォルトは閉じた状態（トグル）
- トグルをクリックすると本文が展開される
- HTMLの `<details>` / `<summary>` タグで実装

**表示イメージ**:
```
▶ AIエージェントの新しいフレームワークが登場
  zenn.dev

  ▼ クリックで展開
  本文テキストがここに表示される。2〜3文の要約。
  技術者が読んで価値を感じる内容に絞る。
```

#### 実装タスク
- [ ] Claude APIプロンプト修正（全記事JSONに `summary` フィールドを追加）
- [ ] `CategoryArticle` 型に `summary` フィールドを追加
- [ ] `src/web/generator.ts` の `articleToHtml` にトグル（details/summary）を追加
- [ ] CSSスタイル調整

### コードレビュー指摘対応

- [ ] `Category` 型と `Article.category` の削除（未使用コード）
- [ ] `escapeHtml` / `parseResponse` のユニットテスト追加
- [ ] `todayWithDayJST` の曜日をIntl.DateTimeFormatでJST固定に修正
- [ ] `loadConfig` のSlack/Anthropic分離

### Phase 3 からの持ち越し

#### CI/CD
- [ ] PR時の自動コードレビュー（`/code-review` をGitHub Actionsで実行）
- [ ] ESLint導入

#### 本番検証
- [ ] 1週間の自動投稿を確認（月〜金の5回）
- [ ] エラー通知の動作確認（意図的にAPIキーを無効化してテスト）
- [ ] dedup動作確認（同日2回実行で重複なし）

### スコープ外（将来検討）
- Slackコマンド対応（双方向通信）
- ニュースのパーソナライズ

## 参照

- [docs/architecture.md](../docs/architecture.md) — RSSフィード一覧・Webビュー仕様・プロンプト
- [.steering/phase3.md](phase3.md) — Phase 3 完了記録
