# Phase 2: 安定化 — ステアリング

> **ステータス**: 完了（2026-03-27）
> **ブランチ**: `feature/phase2-stabilization` → `develop` にマージ済み

## ゴール

本番運用に耐えうる安定性・信頼性を確保する。
重複投稿を防ぎ、障害時に検知できる状態にする。

## スコープ

### 実装タスク

#### リトライ・エラーハンドリング
- [x] 共通リトライユーティリティ作成（指数バックオフ、最大3回）
- [x] Claude API呼び出しにリトライ適用
- [x] Slack投稿にリトライ適用（最終失敗時はローカルログに保存）
- [x] エラー時のSlack通知（`main()` catch でエラー内容を投稿）

#### 重複排除（Dedup）
- [x] `dedup_store.json` の読み書き実装
- [x] RSS取得後に投稿済みURLを照合し新着のみ抽出
- [x] 投稿成功後に記事URLを記録
- [x] 30日超のURLを自動削除（TTL）
- [x] `DEDUP_STORE_PATH` 環境変数でストアパス設定可能化
- [x] メモリキャッシュでファイルI/O削減（4回→2回）

#### 記事数制御
- [x] 全体の記事数上限を設定（デフォルト50件）
- [x] 上限超過時は新しい記事を優先

#### テスト
- [x] テストフレームワーク導入（Vitest）
- [x] 純粋関数のユニットテスト（`splitText`, `stripHtml`, `parseFeeds`, `withRetry`）— 17テスト
- [x] テスト対象関数のexport整理

#### ログ整備
- [ ] 構造化ログ（JSON形式）の検討 → 未着手（現状console.logで運用）
- [ ] 各ステップの実行時間計測 → 未着手

### スコープ外（Phase 3 へ）
- GitHub Actionsワークフロー
- GitHub Secrets設定
- PR時の自動コードレビュー
- 「もっと見る」Webビュー生成

## 完了条件

- [x] 同じ記事が2回投稿されない（dedup動作確認）
- [x] Claude API一時障害時にリトライして復旧する
- [x] 全フェーズ失敗時にSlackにエラー通知が届く
- [x] `npm test` で純粋関数のテストがPASSする
- [ ] `docker compose run --rm app` で2回連続実行して重複なし → 未検証

## コードレビュー結果（Phase 2 完了時）

### 対応済み
- `DEDUP_STORE_PATH` 環境変数でストアパス設定可能化
- `DEDUP_TTL_DAYS` 環境変数でTTL設定可能化
- dedup.tsのメモリキャッシュ化（ファイルI/O削減）
- 未使用の `last_run` フィールド削除

### Phase 3 へ送った課題
- GitHub Actionsでの `dedup_store.json` 永続化（`actions/cache` 等）
- dedup.tsのユニットテスト追加
- retryテストのfake timer化
- ESLint導入

## 成果物

| ファイル | 内容 |
|---|---|
| `src/utils/retry.ts` | 共通リトライユーティリティ（指数バックオフ） |
| `src/utils/dedup.ts` | 重複排除ストア（ファイルベース、メモリキャッシュ） |
| `src/__tests__/splitText.test.ts` | splitTextのユニットテスト |
| `src/__tests__/stripHtml.test.ts` | stripHtmlのユニットテスト |
| `src/__tests__/parseFeeds.test.ts` | parseFeedsのユニットテスト |
| `src/__tests__/retry.test.ts` | withRetryのユニットテスト |

## 技術的な判断事項

| 項目 | 方針 |
|---|---|
| Dedupストレージ | `dedup_store.json`（ファイルベース）。GitHub Actionsでは`actions/cache`で永続化予定 |
| テストフレームワーク | Vitest（軽量・高速・TypeScript対応） |
| リトライ | 自前実装（`src/utils/retry.ts`）。ライブラリ不要な規模 |

## 参照

- [docs/architecture.md](../docs/architecture.md) — エラーハンドリング方針・dedup設計
- [docs/development-guidelines.md](../docs/development-guidelines.md) — Phase 2 定義
- [.steering/phase1.md](phase1.md) — Phase 1 コードレビューで検出された課題
