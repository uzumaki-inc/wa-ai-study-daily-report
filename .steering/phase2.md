# Phase 2: 安定化 — ステアリング

> **ステータス**: 未着手
> **ブランチ**: `feature/phase2-stabilization`（予定）

## ゴール

本番運用に耐えうる安定性・信頼性を確保する。
重複投稿を防ぎ、障害時に検知できる状態にする。

## スコープ

### 実装タスク

#### リトライ・エラーハンドリング
- [ ] 共通リトライユーティリティ作成（指数バックオフ、最大3回）
- [ ] Claude API呼び出しにリトライ適用
- [ ] Slack投稿にリトライ適用（最終失敗時はローカルログに保存）
- [ ] エラー時のSlack通知（`main()` catch でエラー内容を投稿）

#### 重複排除（Dedup）
- [ ] `dedup_store.json` の読み書き実装
- [ ] RSS取得後に投稿済みURLを照合し新着のみ抽出
- [ ] 投稿成功後に記事URLを記録
- [ ] 30日超のURLを自動削除（TTL）

#### 記事数制御
- [ ] 全体の記事数上限を設定（デフォルト50件）
- [ ] 上限超過時は新しい記事を優先

#### テスト
- [ ] テストフレームワーク導入（Vitest推奨）
- [ ] 純粋関数のユニットテスト（`splitText`, `stripHtml`, `parseFeeds`）
- [ ] テスト対象関数のexport整理

#### ログ整備
- [ ] 構造化ログ（JSON形式）の検討
- [ ] 各ステップの実行時間計測

### スコープ外（Phase 3 へ）
- GitHub Actionsワークフロー
- GitHub Secrets設定
- PR時の自動コードレビュー
- 「もっと見る」Webビュー生成

## 完了条件

- [ ] 同じ記事が2回投稿されない（dedup動作確認）
- [ ] Claude API一時障害時にリトライして復旧する
- [ ] 全フェーズ失敗時にSlackにエラー通知が届く
- [ ] `npm test` で純粋関数のテストがPASSする
- [ ] `docker compose run --rm app` で2回連続実行して重複なし

## 技術的な判断事項

| 項目 | 方針 |
|---|---|
| Dedupストレージ | `dedup_store.json`（ファイルベース）でMVP。SQLiteは必要に応じて後で検討 |
| テストフレームワーク | Vitest（軽量・高速・TypeScript対応） |
| リトライ | 自前実装（`src/utils/retry.ts`）。ライブラリ不要な規模 |

## 参照

- [docs/architecture.md](../docs/architecture.md) — エラーハンドリング方針・dedup設計
- [docs/development-guidelines.md](../docs/development-guidelines.md) — Phase 2 定義
- [.steering/phase1.md](phase1.md) — Phase 1 コードレビューで検出された課題
