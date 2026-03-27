# Phase 1: MVP — ステアリング

> **ステータス**: 完了（2026-03-26）
> **ブランチ**: `feature/phase1-mvp` → `develop` にマージ済み

## ゴール

RSS取得 → Claude API要約 → Slack投稿のパイプラインが手動で動作すること。

## スコープ

### 実装タスク

- [x] プロジェクト初期化（`package.json`, `tsconfig.json`, `.env.example`）
- [x] Docker開発環境構築（`Dockerfile`, `docker-compose.yml`）
- [x] 設定モジュール（`src/config/index.ts`）— 環境変数読み込み・デフォルトRSSフィード
- [x] RSSフェッチャー（`src/fetcher/rss.ts`）— 複数フィード並列取得・失敗時スキップ
- [x] Claude要約（`src/summarizer/claude.ts`）— 5カテゴリ分類・タイトル生成
- [x] Slack投稿（`src/poster/slack.ts`）— Block Kit形式で投稿
- [x] エントリポイント（`src/index.ts`）— パイプライン結合
- [x] 手動テスト（`docker compose run --rm app`）で動作確認

### 完了条件

- [x] `docker compose build app` でビルドが通る
- [x] `docker compose run --rm app` でRSS取得 → Claude要約 → Slack投稿が成功する
- [x] Slackチャンネルに投稿フォーマットが正しく表示される

## コードレビュー結果（Phase 1 完了時）

### 対応済み
- 未使用コード削除（`types.ts` の `CATEGORIES`, `CategoryConfig`）
- `tsconfig.json` から不要な `declaration`/`declarationMap` を削除

### Phase 2 へ送った課題
- Claude API / Slack投稿のリトライ機構
- エラー時のSlack通知
- テストフレームワーク導入
- 記事総数の上限制御
- dedup（重複投稿防止）

## 成果物

| ファイル | 内容 |
|---|---|
| `package.json` / `tsconfig.json` / `.env.example` | プロジェクト設定 |
| `Dockerfile` / `docker-compose.yml` / `.dockerignore` | Docker環境 |
| `src/config/index.ts` | 環境変数・デフォルトRSSフィード |
| `src/types.ts` | Article / Category 型定義 |
| `src/fetcher/rss.ts` | RSS並列取得 |
| `src/summarizer/claude.ts` | Claude API要約 |
| `src/poster/slack.ts` | Slack Block Kit投稿 |
| `src/index.ts` | エントリポイント |

## 既知の問題

- The Verge RSS（404エラー）、AI-SCHOLAR（XMLパースエラー）の2フィードが取得失敗
- 環境変数 `RSS_FEED_URLS` で代替フィードに差し替え可能
