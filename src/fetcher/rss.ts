import Parser from 'rss-parser';
import { Article } from '../types';
import { FeedConfig } from '../config';

const parser = new Parser({
  timeout: 10000,
  headers: {
    'User-Agent': 'AI-Study-Daily-Report/1.0',
  },
});

async function fetchSingleFeed(
  feed: FeedConfig,
  maxArticles: number
): Promise<Article[]> {
  const result = await parser.parseURL(feed.url);
  const hostname = new URL(feed.url).hostname.replace('www.', '');

  const articles: Article[] = (result.items || [])
    .slice(0, maxArticles)
    .map((item) => ({
      title: item.title || '(タイトルなし)',
      url: item.link || '',
      summary: stripHtml(item.contentSnippet || item.content || ''),
      publishedAt: item.pubDate ? new Date(item.pubDate) : new Date(),
      source: hostname,
      lang: feed.lang,
      feedCategory: feed.category,
    }));

  return articles;
}

export function stripHtml(text: string): string {
  return text
    .replace(/<[^>]*>/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 500);
}

export async function fetchAllFeeds(
  feeds: FeedConfig[],
  maxArticlesPerFeed: number
): Promise<Article[]> {
  const results = await Promise.allSettled(
    feeds.map((feed) => fetchSingleFeed(feed, maxArticlesPerFeed))
  );

  const articles: Article[] = [];
  results.forEach((result, i) => {
    if (result.status === 'fulfilled') {
      console.log(`[RSS] ${feeds[i].url}: ${result.value.length}件取得`);
      articles.push(...result.value);
    } else {
      console.error(`[RSS] ${feeds[i].url}: 取得失敗 - ${result.reason}`);
    }
  });

  if (articles.length === 0) {
    throw new Error('すべてのRSSフィードの取得に失敗しました');
  }

  // Sort by date (newest first)
  articles.sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime());

  console.log(`[RSS] 合計 ${articles.length}件の記事を取得`);
  return articles;
}
