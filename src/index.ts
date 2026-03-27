import { IncomingWebhook } from '@slack/webhook';
import { loadConfig, Config } from './config';
import { fetchAllFeeds } from './fetcher/rss';
import { summarizeArticles } from './summarizer/claude';
import { postToSlack } from './poster/slack';
import { filterNewArticles, markAsPosted } from './utils/dedup';

async function main() {
  console.log('=== AI学習日報 Slack Bot ===');
  console.log(`実行時刻: ${new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })}`);
  console.log('');

  // 1. 設定読み込み
  const config = loadConfig();
  console.log(`[Config] ${config.feeds.length}件のRSSフィード設定を読み込み`);

  // 2. RSS取得
  const allArticles = await fetchAllFeeds(config.feeds, config.maxArticlesPerFeed);

  // 3. 重複排除 + 件数制限
  const newArticles = filterNewArticles(allArticles);
  const articles = newArticles.slice(0, config.maxArticlesTotal);
  if (articles.length !== newArticles.length) {
    console.log(`[Config] 記事数を${newArticles.length}件から${articles.length}件に制限`);
  }
  if (articles.length === 0) {
    console.log('[完了] 新着記事がありません。投稿をスキップします。');
    return;
  }

  // 4. Claude APIで要約
  const summary = await summarizeArticles(articles, config);

  // 5. ターミナル出力（デバッグ用）
  console.log('\n--- 要約結果 ---');
  console.log(summary);
  console.log('--- ここまで ---\n');

  // 6. Slack投稿
  await postToSlack(summary, config);

  // 7. 投稿済みURLを記録
  markAsPosted(articles.map((a) => a.url));

  console.log('完了しました');
}

async function notifyError(config: Config, error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  try {
    const webhook = new IncomingWebhook(config.slack.webhookUrl);
    await webhook.send({
      text: `⚠️ *AI学習日報の生成に失敗しました*\n\`\`\`${message}\`\`\``,
    });
    console.log('[Slack] エラー通知を送信しました');
  } catch {
    console.error('[Slack] エラー通知の送信にも失敗しました');
  }
}

main().catch(async (error) => {
  console.error('[ERROR]', error.message || error);
  try {
    const config = loadConfig();
    await notifyError(config, error);
  } catch {
    // 設定読み込み自体が失敗した場合は通知できない
  }
  process.exit(1);
});
