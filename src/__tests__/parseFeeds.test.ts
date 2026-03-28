import { describe, it, expect } from 'vitest';
import { parseFeeds } from '../config';

describe('parseFeeds', () => {
  it('URL|lang形式をパースする', () => {
    const result = parseFeeds('https://example.com/feed|ja');
    expect(result).toEqual([
      { url: 'https://example.com/feed', lang: 'ja' },
    ]);
  });

  it('lang省略時はenがデフォルト', () => {
    const result = parseFeeds('https://example.com/feed');
    expect(result).toEqual([
      { url: 'https://example.com/feed', lang: 'en' },
    ]);
  });

  it('カンマ区切りで複数フィードをパースする', () => {
    const result = parseFeeds(
      'https://a.com/feed|en,https://b.com/feed|ja'
    );
    expect(result).toHaveLength(2);
    expect(result[0].lang).toBe('en');
    expect(result[1].lang).toBe('ja');
  });

  it('前後の空白をトリムする', () => {
    const result = parseFeeds('  https://example.com/feed | ja  ');
    expect(result[0].url).toBe('https://example.com/feed');
    expect(result[0].lang).toBe('ja');
  });

  it('不正なlang値でエラーを投げる', () => {
    expect(() => parseFeeds('https://example.com/feed|fr')).toThrow(
      '不正なlang値: "fr"'
    );
  });
});
