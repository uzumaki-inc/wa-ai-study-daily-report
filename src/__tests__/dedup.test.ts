import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs';
import path from 'path';

// テスト用の一時ストアパスを設定
const TEST_STORE_PATH = path.join(__dirname, 'test_dedup_store.json');
process.env.DEDUP_STORE_PATH = TEST_STORE_PATH;

let filterNewArticles: typeof import('../utils/dedup').filterNewArticles;
let markAsPosted: typeof import('../utils/dedup').markAsPosted;

beforeEach(async () => {
  vi.resetModules();
  const mod = await import('../utils/dedup');
  filterNewArticles = mod.filterNewArticles;
  markAsPosted = mod.markAsPosted;
});

afterEach(() => {
  try {
    fs.unlinkSync(TEST_STORE_PATH);
  } catch {
    // ファイルがなければ無視
  }
});

describe('filterNewArticles', () => {
  it('ストアが空なら全記事が新着', () => {
    const articles = [
      { url: 'https://example.com/1', title: 'A' },
      { url: 'https://example.com/2', title: 'B' },
    ];
    const result = filterNewArticles(articles);
    expect(result).toHaveLength(2);
  });

  it('投稿済みURLを除外する', async () => {
    const store = {
      posted_urls: [
        { url: 'https://example.com/1', posted_at: new Date().toISOString() },
      ],
    };
    fs.writeFileSync(TEST_STORE_PATH, JSON.stringify(store), 'utf-8');

    vi.resetModules();
    const mod = await import('../utils/dedup');

    const articles = [
      { url: 'https://example.com/1', title: 'A' },
      { url: 'https://example.com/2', title: 'B' },
    ];
    const result = mod.filterNewArticles(articles);
    expect(result).toHaveLength(1);
    expect(result[0].url).toBe('https://example.com/2');
  });

  it('TTL超過のエントリを削除する', async () => {
    const oldDate = new Date();
    oldDate.setDate(oldDate.getDate() - 31);
    const store = {
      posted_urls: [
        { url: 'https://example.com/old', posted_at: oldDate.toISOString() },
        { url: 'https://example.com/new', posted_at: new Date().toISOString() },
      ],
    };
    fs.writeFileSync(TEST_STORE_PATH, JSON.stringify(store), 'utf-8');

    vi.resetModules();
    const mod = await import('../utils/dedup');
    mod.filterNewArticles([{ url: 'https://example.com/test' }]);
    mod.markAsPosted(['https://example.com/test']);

    const saved = JSON.parse(fs.readFileSync(TEST_STORE_PATH, 'utf-8'));
    const urls = saved.posted_urls.map((e: { url: string }) => e.url);
    expect(urls).not.toContain('https://example.com/old');
    expect(urls).toContain('https://example.com/new');
    expect(urls).toContain('https://example.com/test');
  });
});

describe('markAsPosted', () => {
  it('URLをストアに記録する', () => {
    filterNewArticles([]);
    markAsPosted(['https://example.com/a', 'https://example.com/b']);

    const saved = JSON.parse(fs.readFileSync(TEST_STORE_PATH, 'utf-8'));
    expect(saved.posted_urls).toHaveLength(2);
    expect(saved.posted_urls[0].url).toBe('https://example.com/a');
    expect(saved.posted_urls[1].url).toBe('https://example.com/b');
  });
});
