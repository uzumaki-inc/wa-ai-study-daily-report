import fs from 'fs';
import path from 'path';
import { IncomingWebhook } from '@slack/webhook';
import { loadConfig, Config } from './config';
import { fetchAllFeeds } from './fetcher/rss';
import { summarizeArticles } from './summarizer/claude';
import { postToSlack } from './poster/slack';
import { filterNewArticles, markAsPosted } from './utils/dedup';
import { generateWebView } from './web/generator';

const RESULT_PATH = path.join(process.cwd(), '.slack-pending.json');

async function prepare() {
  console.log('=== AI学習日報 Slack Bot [prepare] ===');
  console.log(`実行時刻: ${new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })}`);
  console.log('');

  const config = loadConfig();
  console.log(`[Config] ${config.feeds.length}件のRSSフィード設定を読み込み`);

  const fetchedArticles = await fetchAllFeeds(config.feeds, config.maxArticlesPerFeed);

  const newArticles = filterNewArticles(fetchedArticles);
  const articles = newArticles.slice(0, config.maxArticlesTotal);
  if (articles.length !== newArticles.length) {
    console.log(`[Config] 記事数を${newArticles.length}件から${articles.length}件に制限`);
  }
  if (articles.length === 0) {
    console.log('[完了] 新着記事がありません。投稿をスキップします。');
    return;
  }

  const { slackText, allArticles: categorizedArticles } = await summarizeArticles(articles, config);

  const today = new Date();
  const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  generateWebView(dateStr, categorizedArticles);

  // Slack投稿用データを一時ファイルに保存
  fs.writeFileSync(RESULT_PATH, JSON.stringify({
    slackText,
    articleUrls: articles.map((a) => a.url),
  }), 'utf-8');

  console.log('[Prepare] 要約・Webビュー生成完了。Slack投稿待ち');
}

async function post() {
  console.log('=== AI学習日報 Slack Bot [post] ===');

  if (!fs.existsSync(RESULT_PATH)) {
    console.log('[Post] 投稿データがありません。スキップします。');
    return;
  }

  const webhookUrl = process.env.SLACK_WEBHOOK_URL;
  if (!webhookUrl) {
    throw new Error('環境変数 SLACK_WEBHOOK_URL が設定されていません');
  }
  const slackConfig = {
    slack: { webhookUrl, channel: process.env.SLACK_CHANNEL || '' },
  } as Config;

  const { slackText, articleUrls } = JSON.parse(fs.readFileSync(RESULT_PATH, 'utf-8'));

  console.log('\n--- 要約結果 ---');
  console.log(slackText);
  console.log('--- ここまで ---\n');

  await postToSlack(slackText, slackConfig);

  markAsPosted(articleUrls);

  // 一時ファイル削除
  fs.unlinkSync(RESULT_PATH);

  console.log('完了しました');
}

async function run() {
  // prepare → Slack投稿を一括実行（ローカル開発用）
  console.log('=== AI学習日報 Slack Bot ===');
  console.log(`実行時刻: ${new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })}`);
  console.log('');

  const config = loadConfig();
  console.log(`[Config] ${config.feeds.length}件のRSSフィード設定を読み込み`);

  const fetchedArticles = await fetchAllFeeds(config.feeds, config.maxArticlesPerFeed);

  const newArticles = filterNewArticles(fetchedArticles);
  const articles = newArticles.slice(0, config.maxArticlesTotal);
  if (articles.length !== newArticles.length) {
    console.log(`[Config] 記事数を${newArticles.length}件から${articles.length}件に制限`);
  }
  if (articles.length === 0) {
    console.log('[完了] 新着記事がありません。投稿をスキップします。');
    return;
  }

  const { slackText, allArticles: categorizedArticles } = await summarizeArticles(articles, config);

  const today = new Date();
  const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  generateWebView(dateStr, categorizedArticles);

  console.log('\n--- 要約結果 ---');
  console.log(slackText);
  console.log('--- ここまで ---\n');

  await postToSlack(slackText, config);

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

// コマンドライン引数でモード切替
const mode = process.argv[2];
const fn = mode === 'prepare' ? prepare : mode === 'post' ? post : run;

fn().catch(async (error) => {
  console.error('[ERROR]', error.message || error);
  try {
    const config = loadConfig();
    await notifyError(config, error);
  } catch {
    // 設定読み込み自体が失敗した場合は通知できない
  }
  process.exit(1);
});
