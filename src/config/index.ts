export type FeedConfig = {
  url: string;
  lang: 'en' | 'ja';
};

const DEFAULT_FEEDS: FeedConfig[] = [
  // English sources
  { url: 'https://techcrunch.com/category/artificial-intelligence/feed/', lang: 'en' },
  { url: 'https://venturebeat.com/category/ai/feed/', lang: 'en' },
  { url: 'https://www.technologyreview.com/feed/', lang: 'en' },
  { url: 'https://www.theverge.com/ai-artificial-intelligence/rss/index.xml', lang: 'en' },
  { url: 'https://www.wired.com/feed/tag/ai/latest/rss', lang: 'en' },
  // Japanese sources (news)
  { url: 'https://rss.itmedia.co.jp/rss/2.0/aiplus.xml', lang: 'ja' },
  { url: 'https://www.publickey1.jp/atom.xml', lang: 'ja' },
  { url: 'https://gigazine.net/news/rss_atom/', lang: 'ja' },
  // Japanese sources (blog - はてぶ・Zenn・note)
  { url: 'https://b.hatena.ne.jp/hotentry/it.rss', lang: 'ja' },
  { url: 'https://b.hatena.ne.jp/search/tag?q=%E4%BA%BA%E5%B7%A5%E7%9F%A5%E8%83%BD&mode=rss', lang: 'ja' },
  { url: 'https://zenn.dev/topics/ai/feed', lang: 'ja' },
  { url: 'https://note.com/rss', lang: 'ja' },
];

export function parseFeeds(raw: string): FeedConfig[] {
  return raw.split(',').map((entry) => {
    const trimmed = entry.trim();
    // Format: "url|lang" or just "url" (defaults to 'en')
    const [url, lang] = trimmed.split('|');
    return {
      url: url.trim(),
      lang: (lang?.trim() as 'en' | 'ja') || 'en',
    };
  });
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`環境変数 ${name} が設定されていません`);
  }
  return value;
}

export function loadConfig() {
  return {
    slack: {
      webhookUrl: requireEnv('SLACK_WEBHOOK_URL'),
      channel: process.env.SLACK_CHANNEL || '',
    },
    anthropic: {
      apiKey: requireEnv('ANTHROPIC_API_KEY'),
      model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-6',

    },
    feeds: process.env.RSS_FEED_URLS
      ? parseFeeds(process.env.RSS_FEED_URLS)
      : DEFAULT_FEEDS,
    maxArticlesPerFeed: parseInt(process.env.MAX_ARTICLES_PER_FEED || '10', 10),
    maxArticlesTotal: parseInt(process.env.MAX_ARTICLES_TOTAL || '50', 10),
    pagesBaseUrl: process.env.PAGES_BASE_URL || 'https://uzumaki-inc.github.io/wa-ai-study-daily-report',
  };
}

export type Config = ReturnType<typeof loadConfig>;
