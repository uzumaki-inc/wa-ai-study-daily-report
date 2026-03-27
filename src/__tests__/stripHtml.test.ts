import { describe, it, expect } from 'vitest';
import { stripHtml } from '../fetcher/rss';

describe('stripHtml', () => {
  it('HTMLタグを除去する', () => {
    expect(stripHtml('<p>hello</p>')).toBe('hello');
  });

  it('ネストしたタグを除去する', () => {
    expect(stripHtml('<div><p>hello <b>world</b></p></div>')).toBe(
      'hello world'
    );
  });

  it('連続する空白を1つにまとめる', () => {
    expect(stripHtml('hello   world\n\nfoo')).toBe('hello world foo');
  });

  it('500文字で切り詰める', () => {
    const long = 'a'.repeat(600);
    expect(stripHtml(long)).toHaveLength(500);
  });

  it('空文字列を処理できる', () => {
    expect(stripHtml('')).toBe('');
  });
});
