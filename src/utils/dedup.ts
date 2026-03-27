import fs from 'fs';
import path from 'path';

const STORE_PATH = path.join(process.cwd(), 'dedup_store.json');
const TTL_DAYS = 30;

type DedupStore = {
  posted_urls: { url: string; posted_at: string }[];
  last_run: string;
};

function loadStore(): DedupStore {
  try {
    const data = fs.readFileSync(STORE_PATH, 'utf-8');
    return JSON.parse(data);
  } catch {
    return { posted_urls: [], last_run: '' };
  }
}

function saveStore(store: DedupStore): void {
  fs.writeFileSync(STORE_PATH, JSON.stringify(store, null, 2), 'utf-8');
}

function pruneOldEntries(store: DedupStore): void {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - TTL_DAYS);
  store.posted_urls = store.posted_urls.filter(
    (entry) => new Date(entry.posted_at) > cutoff
  );
}

export function filterNewArticles<T extends { url: string }>(
  articles: T[]
): T[] {
  const store = loadStore();
  pruneOldEntries(store);
  saveStore(store);

  const postedUrls = new Set(store.posted_urls.map((e) => e.url));
  const newArticles = articles.filter((a) => !postedUrls.has(a.url));

  console.log(
    `[Dedup] ${articles.length}件中 ${newArticles.length}件が新着（${articles.length - newArticles.length}件は投稿済み）`
  );
  return newArticles;
}

export function markAsPosted(urls: string[]): void {
  const store = loadStore();
  const now = new Date().toISOString();
  for (const url of urls) {
    if (!store.posted_urls.some((e) => e.url === url)) {
      store.posted_urls.push({ url, posted_at: now });
    }
  }
  store.last_run = now;
  saveStore(store);
  console.log(`[Dedup] ${urls.length}件のURLを記録`);
}
