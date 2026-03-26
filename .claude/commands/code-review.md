# /code-review — 包括的コードレビュー

変更されたコードに対して、9つの専門エージェントを並列で実行し、統合レビューを行います。

## 実行手順

以下の9つのサブエージェントを**並列**で起動してください:

1. **test-runner** (`.claude/agents/test-runner.md`): テスト実行と失敗分析
2. **linter-checker** (`.claude/agents/linter-checker.md`): 静的解析と型エラー
3. **code-reviewer** (`.claude/agents/code-reviewer.md`): コード品質と改善案
4. **security-reviewer** (`.claude/agents/security-reviewer.md`): 脆弱性・機密情報漏洩
5. **quality-style-reviewer** (`.claude/agents/quality-style-reviewer.md`): 複雑性・重複・規約
6. **test-quality-reviewer** (`.claude/agents/test-quality-reviewer.md`): テストカバレッジとROI
7. **performance-reviewer** (`.claude/agents/performance-reviewer.md`): パフォーマンス問題
8. **deployment-safety-reviewer** (`.claude/agents/deployment-safety-reviewer.md`): デプロイ安全性
9. **simplification-reviewer** (`.claude/agents/simplification-reviewer.md`): シンプル化の機会

## 統合判定

全エージェントの結果を受け取ったら、以下のフォーマットで統合レビューを出力してください:

```
## 統合コードレビュー結果

### 判定: 🟢 Merge可 / 🟡 要注意 / 🔴 要修正

### 判定基準
- 🔴 要修正: Critical問題が1件以上、またはセキュリティFAILがある場合
- 🟡 要注意: Major問題が2件以上、またはテスト失敗がある場合
- 🟢 Merge可: 上記に該当しない場合

### サマリー
| 観点 | 結果 | 主な指摘 |
|---|---|---|
| テスト | PASS/FAIL | ... |
| 型・リント | PASS/FAIL | ... |
| コード品質 | OK/要改善 | ... |
| セキュリティ | PASS/FAIL | ... |
| スタイル・規約 | OK/要改善 | ... |
| テスト品質 | OK/要改善 | ... |
| パフォーマンス | OK/要改善 | ... |
| デプロイ安全性 | OK/要確認 | ... |
| シンプルさ | OK/要改善 | ... |

### 対応が必要な項目（優先度順）
1. ...
2. ...
```

## 注意事項

- 各エージェントの指示ファイルを読み込み、その指示に従って実行すること
- セキュリティレビューでは、公開リポジトリであることを常に意識すること
- 判定は保守的に行う（迷ったら厳しい方を選ぶ）
