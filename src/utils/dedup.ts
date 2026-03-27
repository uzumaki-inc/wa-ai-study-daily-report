import fs from 'fs';
import path from 'path';

const STORE_PATH =
  process.env.DEDUP_STORE_PATH ||
  path.join(process.cwd(), 'dedup_store.json');
const TTL_DAYS = parseInt(process.env.DEDUP_TTL_DAYS || '30', 10);

type DedupEntry = { url: string; posted_at: string };

type DedupStore = {
  posted_urls: DedupEntry[];
};

// メモリキャッシュ — 1実行で1回だけファイルを読む
let _cache: DedupStore | null = null;

function loadStore(): DedupStore {
  if (_cache) return _cache;
  try {
    const data = fs.readFileSync(STORE_PATH, 'utf-8');
    _cache = JSON.parse(data);
    return _cache!;
  } catch {
    _cache = { posted_urls: [] };
    return _cache;
  }
}

function saveStore(store: DedupStore): void {
  fs.writeFileSync(STORE_PATH, JSON.stringify(store, null, 2), 'utf-8');
}

export function filterNewArticles<T extends { url: string }>(
  articles: T[]
): T[] {
  const store = loadStore();

  // TTL超過の古いエントリを削除
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - TTL_DAYS);
  store.posted_urls = store.posted_urls.filter(
    (entry) => new Date(entry.posted_at) > cutoff
  );

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
    store.posted_urls.push({ url, posted_at: now });
  }
  saveStore(store);
  console.log(`[Dedup] ${urls.length}件のURLを記録`);
}
