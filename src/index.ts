import { loadConfig } from './config';
import { fetchAllFeeds } from './fetcher/rss';
import { summarizeArticles } from './summarizer/claude';
import { postToSlack } from './poster/slack';

async function main() {
  console.log('=== AI学習日報 Slack Bot ===');
  console.log(`実行時刻: ${new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })}`);
  console.log('');

  // 1. 設定読み込み
  const config = loadConfig();
  console.log(`[Config] ${config.feeds.length}件のRSSフィード設定を読み込み`);

  // 2. RSS取得
  const articles = await fetchAllFeeds(config.feeds, config.maxArticlesPerFeed);

  // 3. Claude APIで要約
  const summary = await summarizeArticles(articles, config);

  // 4. ターミナル出力（デバッグ用）
  console.log('\n--- 要約結果 ---');
  console.log(summary);
  console.log('--- ここまで ---\n');

  // 5. Slack投稿
  await postToSlack(summary, config);

  console.log('完了しました');
}

main().catch((error) => {
  console.error('[ERROR]', error.message || error);
  process.exit(1);
});
