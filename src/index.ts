import fs from 'fs';
import path from 'path';
import { IncomingWebhook } from '@slack/webhook';
import { loadConfig } from './config';
import { fetchAllFeeds } from './fetcher/rss';
import { summarizeArticles } from './summarizer/claude';
import { postToSlack } from './poster/slack';
import { filterNewArticles, markAsPosted } from './utils/dedup';
import { generateWebView } from './web/generator';
import { todayJST } from './utils/date';

const RESULT_PATH = path.join(process.cwd(), '.slack-pending.json');

type PrepareResult = {
  slackText: string;
  articleUrls: string[];
};

async function prepareCore(): Promise<PrepareResult | null> {
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
    return null;
  }

  const { slackText, allArticles: categorizedArticles } = await summarizeArticles(articles, config);

  generateWebView(todayJST(), categorizedArticles);

  return { slackText, articleUrls: articles.map((a) => a.url) };
}

async function prepare() {
  console.log('=== AI学習日報 Slack Bot [prepare] ===');
  console.log(`実行時刻: ${new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })}\n`);

  const result = await prepareCore();
  if (!result) return;

  fs.writeFileSync(RESULT_PATH, JSON.stringify(result), 'utf-8');
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

  const { slackText, articleUrls } = JSON.parse(fs.readFileSync(RESULT_PATH, 'utf-8'));

  console.log('\n--- 要約結果 ---');
  console.log(slackText);
  console.log('--- ここまで ---\n');

  await postToSlack(slackText, { slack: { webhookUrl, channel: process.env.SLACK_CHANNEL || '' } });

  markAsPosted(articleUrls);
  fs.unlinkSync(RESULT_PATH);

  console.log('完了しました');
}

async function dryrun() {
  console.log('=== AI学習日報 Slack Bot [dry-run] ===');
  console.log(`実行時刻: ${new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })}\n`);

  const result = await prepareCore();
  if (!result) return;

  console.log('\n--- 要約結果 ---');
  console.log(result.slackText);
  console.log('--- ここまで ---\n');

  console.log('[Dry-run] Slack投稿をスキップしました');
}

async function run() {
  console.log('=== AI学習日報 Slack Bot ===');
  console.log(`実行時刻: ${new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })}\n`);

  const result = await prepareCore();
  if (!result) return;

  console.log('\n--- 要約結果 ---');
  console.log(result.slackText);
  console.log('--- ここまで ---\n');

  const config = loadConfig();
  await postToSlack(result.slackText, config);

  markAsPosted(result.articleUrls);

  console.log('完了しました');
}

async function notifyError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  const webhookUrl = process.env.SLACK_WEBHOOK_URL;
  if (!webhookUrl) return;

  try {
    const webhook = new IncomingWebhook(webhookUrl);
    await webhook.send({
      text: `⚠️ *AI学習日報の生成に失敗しました*\n\`\`\`${message.slice(0, 500)}\`\`\``,
    });
    console.log('[Slack] エラー通知を送信しました');
  } catch {
    console.error('[Slack] エラー通知の送信にも失敗しました');
  }
}

const mode = process.argv[2];
const fn =
  mode === 'prepare' ? prepare :
  mode === 'post' ? post :
  mode === 'dry-run' ? dryrun :
  run;

fn().catch(async (error) => {
  console.error('[ERROR]', error.message || error);
  await notifyError(error);
  process.exit(1);
});
